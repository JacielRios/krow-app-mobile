package com.krownmobileapp.runtime

import android.content.Intent
import android.os.Build
import android.Manifest
import android.content.pm.PackageManager
import com.facebook.react.bridge.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class PilotTrackingModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "KrowPilotTracking"
    @ReactMethod fun start(config: String, promise: Promise) {
        var requested: String? = null
        try {
            if (context.currentActivity?.hasWindowFocus() != true) throw IllegalStateException("Abre KROW para iniciar el GPS")
            // Check again natively: permission may be revoked after the JS prompt.
            if (context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED)
                throw SecurityException("Permite la ubicación precisa")
            val state = JSONObject(config)
            val url = URL(state.getString("url"))
            if (url.protocol != "https" && !com.krownmobileapp.BuildConfig.DEBUG) throw IllegalArgumentException("GPS requiere HTTPS")
            if (state.getString("rideId").isBlank() || state.getString("sessionId").isBlank() ||
                state.getString("uploadToken").isBlank() || state.getLong("expiresAtMillis") <= System.currentTimeMillis())
                throw IllegalArgumentException("La sesión GPS no es válida")
            requested = state.getString("sessionId")
            PilotTrackingService.requestedSessionId = requested
            val intent = Intent(context, PilotTrackingService::class.java).putExtra("config", config)
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
            promise.resolve(true)
        } catch (_: Exception) {
            if (requested != null && PilotTrackingService.requestedSessionId == requested) PilotTrackingService.requestedSessionId = null
            promise.reject("GPS_START", "No pudimos iniciar el GPS. Abre KROW y revisa los permisos.")
        }
    }
    @ReactMethod fun status(promise: Promise) {
        val session = PilotTrackingService.activeSession
        promise.resolve(Arguments.createMap().apply { putString("rideId", session?.first); putString("sessionId", session?.second); putString("error", PilotTrackingService.lastError) })
    }
    @ReactMethod fun stop(promise: Promise) {
        PilotTrackingService.requestedSessionId = null
        var journal: NavigationJournal? = null
        var state: JSONObject? = null
        try {
            journal = NavigationJournal(context, "krow-pilot.db", "krow.pilot.v1")
            state = journal.state()
        } catch (_: Exception) {
            PilotTrackingService.lastError = "No pudimos leer el almacenamiento GPS"
        } finally {
            // Storage failure must never prevent stopping capture during logout.
            context.stopService(Intent(context, PilotTrackingService::class.java))
            try { journal?.clear() } catch (_: Exception) {
                PilotTrackingService.lastError = "No pudimos limpiar el almacenamiento GPS"
            } finally {
                try { journal?.close() } catch (_: Exception) {
                    PilotTrackingService.lastError = "No pudimos cerrar el almacenamiento GPS"
                }
            }
        }
        // Best-effort remote revocation; terminal trip commands revoke in SQL.
        val session = state
        if (session != null) Executors.newSingleThreadExecutor().apply {
            submit {
                var connection: HttpURLConnection? = null
                try {
                    connection = URL(session.getString("url") + "/close").openConnection() as HttpURLConnection
                    connection.apply { requestMethod="POST"; connectTimeout=3000; readTimeout=3000; doOutput=true; setRequestProperty("Content-Type","application/json") }
                    val body=JSONObject().put("sessionId",session.getString("sessionId")).put("uploadToken",session.getString("uploadToken"))
                    connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }; connection.responseCode
                } catch (_: Exception) { } finally { connection?.disconnect() }
            }; shutdown()
        }
        promise.resolve(true)
    }
    @ReactMethod fun stopSession(sessionId: String, promise: Promise) {
        if (PilotTrackingService.requestedSessionId != sessionId) {
            promise.resolve(false)
            return
        }
        stop(promise)
    }
}
