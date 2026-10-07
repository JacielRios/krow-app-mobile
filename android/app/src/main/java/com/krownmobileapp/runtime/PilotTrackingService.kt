package com.krownmobileapp.runtime

import android.app.*
import android.content.Intent
import android.content.Context
import android.content.pm.ServiceInfo
import android.content.pm.PackageManager
import android.Manifest
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.Bundle
import org.json.JSONObject
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** Independent online pilot capture. No Mapbox, React timers, or navigation SDK. */
class PilotTrackingService : Service(), LocationListener {
    companion object {
        @Volatile var activeSession: Pair<String, String>? = null
        val activeRide: String? get() = activeSession?.first
        @Volatile var requestedSessionId: String? = null
        @Volatile var lastError: String? = null
        const val CHANNEL = "krow.pilot.location"
    }
    private lateinit var manager: LocationManager
    private lateinit var journal: NavigationJournal
    private val executor = Executors.newSingleThreadScheduledExecutor()
    private var lastCapture = 0L
    private var uploaderStarted = false
    private var foregroundReady = false
    @Volatile private var stopping = false
    override fun onCreate() {
        super.onCreate()
        try {
        journal = NavigationJournal(this, "krow-pilot.db", "krow.pilot.v1")
        manager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        if (Build.VERSION.SDK_INT >= 26) (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .createNotificationChannel(NotificationChannel(CHANNEL, "GPS del viaje", NotificationManager.IMPORTANCE_LOW))
        val pending = PendingIntent.getActivity(this, 0, packageManager.getLaunchIntentForPackage(packageName), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, CHANNEL) else Notification.Builder(this)
        val notification = builder.setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentTitle("KROW · Viaje en curso")
            .setContentText("GPS activo. Abre KROW para atender las paradas o finalizar.").setContentIntent(pending).setOngoing(true).build()
        if (Build.VERSION.SDK_INT >= 29) startForeground(6201, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION) else startForeground(6201, notification)
        foregroundReady = true
        } catch (_: Exception) {
            lastError = "No pudimos iniciar el GPS. Abre KROW y revisa los permisos."
            stopSelf()
        }
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val config = intent?.getStringExtra("config")
        if (config == null || !foregroundReady) { stopSelf(); return START_NOT_STICKY }
        try {
            val state = JSONObject(config)
            // A queued start from an account that logged out cannot supersede a newer start.
            if (requestedSessionId != state.getString("sessionId")) return START_NOT_STICKY
            if (activeRide != state.getString("rideId")) journal.clear()
            journal.saveState(state)
            activeSession = Pair(state.getString("rideId"), state.getString("sessionId"))
            if (!uploaderStarted) { uploaderStarted = true; executor.scheduleWithFixedDelay({ upload() }, 0, 2, TimeUnit.SECONDS) }
            lastError = null
            manager.removeUpdates(this)
            for (provider in listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)) {
                if (manager.isProviderEnabled(provider)) manager.requestLocationUpdates(provider, 2000L, 0f, this)
            }
            if (!manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) lastError = "Activa la ubicación del dispositivo"
        } catch (_: Exception) { lastError = "No pudimos iniciar el GPS. Revisa los permisos."; stopSelf() }
        // Never promise restart after force-stop or boot. Visible app must restart.
        return START_NOT_STICKY
    }
    override fun onLocationChanged(location: Location) {
        if (stopping || !::journal.isInitialized) return
        try {
            val now = System.currentTimeMillis()
            // Android/OEM providers can report partial/nonfinite fixes. JSONObject
            // rejects NaN/Infinity: construct it inside this callback's guard.
            val age = android.os.SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos
            if (!location.latitude.isFinite() || !location.longitude.isFinite() ||
                location.latitude !in -90.0..90.0 || location.longitude !in -180.0..180.0 ||
                !location.hasAccuracy() || !location.accuracy.isFinite() || location.accuracy !in 0f..200f ||
                location.time <= 0 || location.time > now + 10000 ||
                location.elapsedRealtimeNanos <= 0 || age !in 0L..10_000_000_000L) return
            val interval = if (location.hasSpeed() && location.speed.isFinite() && location.speed > 0.8f) 2000 else 5000
            if (now - lastCapture < interval) return
            val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
            val sample = JSONObject().put("capturedAt", formatter.format(Date(location.time)))
                .put("lat", location.latitude).put("lng", location.longitude).put("accuracy", location.accuracy.toDouble())
            if (location.hasSpeed() && location.speed.isFinite()) sample.put("speed", location.speed.toDouble().coerceIn(0.0, 80.0))
            if (location.hasBearing() && location.bearing.isFinite()) sample.put("heading", location.bearing.toDouble().coerceIn(0.0, 359.999))
            journal.append(sample)
            journal.prune(600000)
            lastCapture = now
        } catch (_: Exception) {
            lastError = "No pudimos guardar la posición de forma segura. Abre KROW para reanudar."
            stopSelf()
        }
    }
    private fun upload() {
        var connection: HttpURLConnection? = null
        var uploadSessionId: String? = null
        try {
            if (stopping) return
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                lastError = "Permiso de ubicación precisa revocado"; stopSelf(); return
            }
            val state = journal.state() ?: return
            if (activeRide != state.getString("rideId")) return
            if (requestedSessionId != state.getString("sessionId")) return
            uploadSessionId = state.getString("sessionId")
            if (System.currentTimeMillis() > state.getLong("expiresAtMillis")) { lastError = "La sesión GPS expiró. Abre KROW para reanudar."; stopSelf(); return }
            // Samples may already be ten seconds old when first received.
            journal.prune(590000)
            val samples = journal.drain()
            if (samples.length() == 0) return
            val batch = JSONArray()
            for (i in 0 until samples.length()) batch.put(samples.getJSONObject(i).apply { put("seq", getLong("sequence")); remove("sequence") })
            val body = JSONObject().put("sessionId", state.getString("sessionId")).put("uploadToken", state.getString("uploadToken")).put("samples", batch)
            connection = URL(state.getString("url")).openConnection() as HttpURLConnection
            connection.apply { requestMethod = "POST"; connectTimeout = 5000; readTimeout = 5000; doOutput = true; setRequestProperty("Content-Type", "application/json") }
            connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val code = connection.responseCode
            // A response from a replaced session must not stop or clear errors of its successor.
            if (stopping || requestedSessionId != uploadSessionId || journal.state()?.optString("sessionId") != uploadSessionId) return
            if (code in 200..299) {
                val response = connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
                if (!stopping && journal.state()?.optString("sessionId") == state.getString("sessionId")) {
                    journal.acknowledge(response.getLong("acknowledgedSeq")); lastError = null
                }
            } else if (code == 401 || code == 403) {
                lastError = "El GPS perdió acceso al viaje"; stopSelf()
            } else if (code == 400) { journal.prune(590000); lastError = "El GPS necesita una posición más precisa" }
            else lastError = "Reconectando el GPS…"
        } catch (_: SecurityException) { lastError = "Permiso de ubicación revocado"; stopSelf() }
        catch (_: Exception) { if (!stopping && (uploadSessionId == null || requestedSessionId == uploadSessionId)) lastError = "Sin conexión. El GPS reintentará." }
        finally { connection?.disconnect() }
    }
    override fun onProviderDisabled(provider: String) { lastError = "GPS no disponible. Activa la ubicación." }
    override fun onProviderEnabled(provider: String) { lastError = null }
    @Deprecated("Android location callback") override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit
    override fun onDestroy() {
        stopping = true
        if (::manager.isInitialized) try { manager.removeUpdates(this) } catch (_: Exception) { }
        executor.shutdownNow()
        activeSession = null
        if (::journal.isInitialized) {
            try { journal.clear() } catch (_: Exception) { lastError = "No pudimos limpiar el almacenamiento GPS" }
            finally {
                try { journal.close() } catch (_: Exception) { lastError = "No pudimos cerrar el almacenamiento GPS" }
            }
        }
        super.onDestroy()
    }
    override fun onBind(intent: Intent?): IBinder? = null
}
