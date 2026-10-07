package com.krownmobileapp.runtime

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import com.krownmobileapp.R

class KrowNotificationsModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    companion object {
        fun initializeIfEnabled(context: android.content.Context) {
            if (!context.getSharedPreferences("krow_push", 0).getBoolean("enabled", false)) return
            initialize(context)
        }
        private fun initialize(context: android.content.Context) {
            if (FirebaseApp.getApps(context).isNotEmpty()) return
            val appId = context.getString(R.string.krow_firebase_app_id)
            val apiKey = context.getString(R.string.krow_firebase_api_key)
            val project = context.getString(R.string.krow_firebase_project_id)
            val sender = context.getString(R.string.krow_firebase_sender_id)
            if (listOf(appId, apiKey, project, sender).any { it.isBlank() }) return
            FirebaseApp.initializeApp(context, FirebaseOptions.Builder().setApplicationId(appId)
                .setApiKey(apiKey).setProjectId(project).setGcmSenderId(sender).build())
        }
    }
    override fun getName() = "KrowNotifications"
    @ReactMethod fun setSessionActor(actor: String) {
        context.getSharedPreferences("krow_push", 0).edit().putString("actor_id",actor).apply()
    }
    @ReactMethod fun setSessionActive(active: Boolean) {
        context.getSharedPreferences("krow_push", 0).edit().putBoolean("session_active", active).apply()
        if (!active) androidx.core.app.NotificationManagerCompat.from(context).cancelAll()
    }

    @ReactMethod fun requestToken(promise: Promise) {
        try {
            val appId = context.getString(R.string.krow_firebase_app_id)
            val apiKey = context.getString(R.string.krow_firebase_api_key)
            val project = context.getString(R.string.krow_firebase_project_id)
            val sender = context.getString(R.string.krow_firebase_sender_id)
            require(listOf(appId, apiKey, project, sender).all { it.isNotBlank() }) { "Falta configurar FCM en esta compilación" }
            if (FirebaseApp.getApps(context).isEmpty()) {
                FirebaseApp.initializeApp(context, FirebaseOptions.Builder().setApplicationId(appId)
                    .setApiKey(apiKey).setProjectId(project).setGcmSenderId(sender).build())
            }
            KrowMessagingService.createChannel(context)
            FirebaseMessaging.getInstance().isAutoInitEnabled = true
            FirebaseMessaging.getInstance().token.addOnSuccessListener {
                context.getSharedPreferences("krow_push", 0).edit().putBoolean("enabled", true).apply()
                promise.resolve(it)
            }
                .addOnFailureListener { promise.reject("PUSH_UNAVAILABLE", "No se pudo registrar el dispositivo") }
        } catch (error: Exception) { promise.reject("PUSH_CONFIGURATION", error.message) }
    }
}

class KrowNotificationsPackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(KrowNotificationsModule(context))
    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
