package com.krownmobileapp.runtime

import android.content.Context
import android.os.Build
import com.facebook.react.bridge.*
import org.json.JSONArray
import org.json.JSONObject

/** Local, user-exported diagnostics. No account, message, token or location data. */
object KrowDiagnostics {
    private const val STORE = "krow.diagnostics"
    fun install(context: Context) {
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            try {
                val causes = JSONArray()
                var current: Throwable? = error
                repeat(4) {
                    val cause = current
                    if (cause != null) {
                        causes.put(JSONObject().put("type", cause.javaClass.name)
                            .put("frames", JSONArray(cause.stackTrace.take(24).map { it.toString() })))
                        current = cause.cause
                    }
                }
                context.getSharedPreferences(STORE, Context.MODE_PRIVATE).edit()
                    .putString("lastNativeFailure", JSONObject().put("at", System.currentTimeMillis()).put("causes", causes).toString()).commit()
            } catch (_: Exception) { }
            previous?.uncaughtException(thread, error)
        }
    }
    fun report(context: Context): String {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        val prefs = context.getSharedPreferences(STORE, Context.MODE_PRIVATE)
        return JSONObject().put("application", context.packageName).put("version", info.versionName)
            .put("android", Build.VERSION.RELEASE).put("manufacturer", Build.MANUFACTURER).put("model", Build.MODEL)
            .put("generatedAt", System.currentTimeMillis())
            .put("lastNativeFailure", prefs.getString("lastNativeFailure", null)?.let { JSONObject(it) })
            .put("lastScreenFailure", prefs.getString("lastScreenFailure", null)?.let { JSONObject(it) }).toString(2)
    }
    fun screen(context: Context, type: String) {
        val safeType = type.take(80).replace(Regex("[^a-zA-Z0-9_.]"), "")
        context.getSharedPreferences(STORE, Context.MODE_PRIVATE).edit().putString("lastScreenFailure",
            JSONObject().put("at",System.currentTimeMillis()).put("type",safeType).toString()).apply()
    }
}
class KrowDiagnosticsModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "KrowDiagnostics"
    @ReactMethod fun getReport(promise: Promise) {
        try { promise.resolve(KrowDiagnostics.report(context)) }
        catch (_: Exception) { promise.reject("DIAGNOSTICS", "No pudimos preparar el diagnóstico") }
    }
    @ReactMethod fun recordScreenFailure(type: String) { KrowDiagnostics.screen(context, type) }
}
