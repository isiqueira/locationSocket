package com.locationsocket

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Binder
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

/**
 * ForegroundService responsável por:
 * 1. Coletar localização via FusedLocationProvider a cada 5s
 * 2. Emitir evento "change" via SocketClient
 * 3. Consultar /where-i-am via WhereIAmClient (debounce: só quando muda >50m)
 * 4. Notificar a Activity via callbacks
 */
class LocationService : Service() {

    companion object {
        private const val TAG = "LocationService"
        private const val NOTIFICATION_ID = 1
        private const val LOCATION_INTERVAL_MS = 5000L
        private const val LOCATION_FASTEST_INTERVAL_MS = 2000L
        private const val MIN_DISPLACEMENT_METERS = 50f

        const val EXTRA_SERVER_URL = "extra_server_url"
        const val EXTRA_DEVICE_ID = "extra_device_id"
    }

    // Binder para comunicação com a Activity
    inner class LocalBinder : Binder() {
        fun getService(): LocationService = this@LocationService
    }

    private val binder = LocalBinder()

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var socketClient: SocketClient
    private lateinit var whereIAmClient: WhereIAmClient
    private lateinit var deviceId: String

    // Callbacks para a Activity
    var onStatusChanged: ((String) -> Unit)? = null
    var onLocationChanged: ((Double, Double) -> Unit)? = null
    var onCityChanged: ((CityResult?) -> Unit)? = null

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val location = result.lastLocation ?: return
            val lat = location.latitude
            val lng = location.longitude

            Log.d(TAG, "Location: $lat, $lng")
            onLocationChanged?.invoke(lat, lng)

            // Emite via socket
            socketClient.emitLocation(deviceId, lat, lng)

            // Consulta cidade
            whereIAmClient.fetchCity(
                latitude = lat,
                longitude = lng,
                onResult = { city -> onCityChanged?.invoke(city) },
                onError = { err -> Log.e(TAG, "WhereIAm error: $err") }
            )
        }
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val serverUrl = intent?.getStringExtra(EXTRA_SERVER_URL)
            ?: getString(R.string.default_server_url)
        deviceId = intent?.getStringExtra(EXTRA_DEVICE_ID) ?: "android-unknown"

        socketClient = SocketClient(serverUrl)
        whereIAmClient = WhereIAmClient(serverUrl)

        socketClient.onConnected = {
            onStatusChanged?.invoke(getString(R.string.status_tracking))
        }
        socketClient.onDisconnected = {
            onStatusChanged?.invoke(getString(R.string.status_disconnected))
        }
        socketClient.onConnectError = {
            onStatusChanged?.invoke(getString(R.string.error_connection_failed))
        }

        socketClient.connect()
        startLocationUpdates()
        startForeground(NOTIFICATION_ID, buildNotification())

        return START_STICKY
    }

    private fun startLocationUpdates() {
        val request = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            LOCATION_INTERVAL_MS
        )
            .setMinUpdateIntervalMillis(LOCATION_FASTEST_INTERVAL_MS)
            .setMinUpdateDistanceMeters(MIN_DISPLACEMENT_METERS)
            .build()

        try {
            fusedLocationClient.requestLocationUpdates(
                request,
                locationCallback,
                Looper.getMainLooper()
            )
            Log.i(TAG, "Location updates started")
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission not granted: ${e.message}")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        socketClient.disconnect()
        Log.i(TAG, "LocationService destroyed")
    }

    override fun onBind(intent: Intent?): IBinder = binder

    // ── Notification ──────────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            getString(R.string.notification_channel_id),
            getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Mantém o rastreamento de localização ativo em segundo plano"
        }
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, getString(R.string.notification_channel_id))
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_text))
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
}
