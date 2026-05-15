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
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.locationsocket.databinding.ActivityMainBinding
import org.json.JSONArray
import org.json.JSONObject
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.overlay.Polygon
import java.io.File
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
                            renderCityPolygon(city.geometryJson)
                        } else {
                            binding.tvCity.text = getString(R.string.placeholder_city_not_found)
                            binding.tvState.text = ""
                            clearMap()
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

        Configuration.getInstance().apply {
            userAgentValue = packageName
            osmdroidBasePath = cacheDir
            osmdroidTileCache = File(cacheDir, "osmdroid")
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.mapView.apply {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(false)
            isClickable = false
        }

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

    override fun onResume() {
        super.onResume()
        binding.mapView.onResume()
    }

    override fun onPause() {
        super.onPause()
        binding.mapView.onPause()
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
        clearMap()
    }

    // ── Map rendering ─────────────────────────────────────────────────────────

    private fun renderCityPolygon(geometryJson: String?) {
        if (geometryJson.isNullOrBlank()) { clearMap(); return }
        try {
            val geo = JSONObject(geometryJson)
            val allPoints = mutableListOf<GeoPoint>()
            binding.mapView.overlays.clear()

            when (geo.optString("type")) {
                "Polygon" -> {
                    val pts = parseRing(geo.getJSONArray("coordinates").getJSONArray(0))
                    allPoints += pts
                    binding.mapView.overlays.add(buildPolygon(pts))
                }
                "MultiPolygon" -> {
                    val polys = geo.getJSONArray("coordinates")
                    for (i in 0 until polys.length()) {
                        val pts = parseRing(polys.getJSONArray(i).getJSONArray(0))
                        allPoints += pts
                        binding.mapView.overlays.add(buildPolygon(pts))
                    }
                }
                else -> { clearMap(); return }
            }

            if (allPoints.isEmpty()) { clearMap(); return }

            val box = BoundingBox.fromGeoPoints(allPoints)
            binding.mapView.visibility = View.VISIBLE
            binding.mapView.post {
                binding.mapView.zoomToBoundingBox(box, false, 40)
            }
            binding.mapView.invalidate()
        } catch (_: Exception) {
            clearMap()
        }
    }

    private fun parseRing(ring: JSONArray): List<GeoPoint> {
        val pts = mutableListOf<GeoPoint>()
        for (i in 0 until ring.length()) {
            val coord = ring.getJSONArray(i)
            val lng = coord.getDouble(0)
            val lat = coord.getDouble(1)
            if (lat.isFinite() && lng.isFinite()) pts.add(GeoPoint(lat, lng))
        }
        return pts
    }

    private fun buildPolygon(points: List<GeoPoint>) = Polygon().apply {
        this.points = points
        fillPaint.color = 0x33E94560.toInt()
        outlinePaint.color = 0xFFE94560.toInt()
        outlinePaint.strokeWidth = 4f
    }

    private fun clearMap() {
        binding.mapView.overlays.clear()
        binding.mapView.visibility = View.GONE
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
