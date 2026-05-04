package com.locationsocket

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.locationsocket.databinding.ActivityMainBinding
import java.util.UUID

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    private var locationService: LocationService? = null
    private var isServiceBound = false
    private var isTracking = false

    private val deviceId: String by lazy { loadOrCreateDeviceId() }

    // ── Service connection ────────────────────────────────────────────────────

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            val localBinder = binder as? LocationService.LocalBinder ?: return
            locationService = localBinder.getService().also { service ->
                service.onStatusChanged = { status -> runOnUiThread { setStatus(status) } }
                service.onLocationChanged = { lat, lng ->
                    runOnUiThread {
                        binding.tvCoordinates.text = "%.6f, %.6f".format(lat, lng)
                    }
                }
                service.onCityChanged = { city ->
                    runOnUiThread {
                        if (city != null) {
                            binding.tvCity.text = city.name
                            binding.tvState.text = city.state
                        } else {
                            binding.tvCity.text = getString(R.string.placeholder_city_not_found)
                            binding.tvState.text = ""
                        }
                    }
                }
            }
            isServiceBound = true
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            locationService = null
            isServiceBound = false
        }
    }

    // ── Permission launchers ──────────────────────────────────────────────────

    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            startTracking()
        } else {
            Toast.makeText(this, getString(R.string.error_permission_denied), Toast.LENGTH_LONG).show()
        }
    }

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* notification permission is optional — proceed regardless */ }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.tvDeviceId.text = "ID: $deviceId"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        binding.btnToggleTracking.setOnClickListener {
            if (isTracking) stopTracking() else requestLocationPermissionAndStart()
        }

        binding.btnSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (isServiceBound) {
            unbindService(serviceConnection)
            isServiceBound = false
        }
    }

    // ── Tracking control ──────────────────────────────────────────────────────

    private fun requestLocationPermissionAndStart() {
        val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (fine == PackageManager.PERMISSION_GRANTED || coarse == PackageManager.PERMISSION_GRANTED) {
            startTracking()
        } else {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    private fun startTracking() {
        val serverUrl = loadServerUrl()
        val serviceIntent = Intent(this, LocationService::class.java).apply {
            putExtra(LocationService.EXTRA_SERVER_URL, serverUrl)
            putExtra(LocationService.EXTRA_DEVICE_ID, deviceId)
        }
        ContextCompat.startForegroundService(this, serviceIntent)
        bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE)

        isTracking = true
        binding.btnToggleTracking.text = getString(R.string.btn_stop_tracking)
        setStatus(getString(R.string.status_connecting))
    }

    private fun stopTracking() {
        if (isServiceBound) {
            unbindService(serviceConnection)
            isServiceBound = false
        }
        stopService(Intent(this, LocationService::class.java))

        isTracking = false
        binding.btnToggleTracking.text = getString(R.string.btn_start_tracking)
        setStatus(getString(R.string.status_disconnected))
        binding.tvCoordinates.text = getString(R.string.placeholder_waiting)
        binding.tvCity.text = getString(R.string.placeholder_waiting)
        binding.tvState.text = ""
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    private fun setStatus(status: String) {
        binding.tvStatus.text = status
        binding.tvStatus.setTextColor(
            ContextCompat.getColor(
                this, when (status) {
                    getString(R.string.status_connected),
                    getString(R.string.status_tracking) -> R.color.status_connected
                    getString(R.string.status_connecting) -> R.color.status_connecting
                    else -> R.color.status_disconnected
                }
            )
        )
    }

    // ── Persistence ───────────────────────────────────────────────────────────

    private fun loadServerUrl(): String {
        val prefs = getSharedPreferences(getString(R.string.pref_file), Context.MODE_PRIVATE)
        return prefs.getString(getString(R.string.pref_server_url), getString(R.string.default_server_url))
            ?: getString(R.string.default_server_url)
    }

    private fun loadOrCreateDeviceId(): String {
        val prefs = getSharedPreferences(getString(R.string.pref_file), Context.MODE_PRIVATE)
        val key = "device_id"
        return prefs.getString(key, null) ?: run {
            val id = "android-${UUID.randomUUID()}"
            prefs.edit().putString(key, id).apply()
            id
        }
    }
}
