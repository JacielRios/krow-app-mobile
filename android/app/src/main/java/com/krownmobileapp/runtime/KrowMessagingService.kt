package com.krownmobileapp.runtime

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.krownmobileapp.MainActivity
import com.krownmobileapp.R
import java.util.UUID

class KrowMessagingService : FirebaseMessagingService() {
    companion object {
        const val CHANNEL = "krow_trip_updates"
        fun createChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= 26) {
                val channel = NotificationChannel(CHANNEL, "Actualizaciones del viaje", NotificationManager.IMPORTANCE_HIGH)
                channel.lockscreenVisibility = NotificationCompat.VISIBILITY_PRIVATE
                context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
            }
        }
    }
    override fun onMessageReceived(message: RemoteMessage) {
        if (!getSharedPreferences("krow_push", 0).getBoolean("session_active", false)) return
        val ride = message.data["rideId"] ?: return
        val id = message.data["intentId"] ?: return
        try { UUID.fromString(ride); UUID.fromString(id) } catch (_: Exception) { return }
        val expires = message.data["expiresAt"]?.toLongOrNull() ?: return
        val remaining = expires - System.currentTimeMillis()
        if (remaining <= 0) return
        val origin = Uri.parse(getString(R.string.krow_link_origin))
        if (origin.scheme != "https" || origin.host.isNullOrBlank()) return
        createChannel(this)
        if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) return
        val uri = origin.buildUpon().appendPath("rides").appendPath(ride).build()
        val intent = Intent(this, MainActivity::class.java).setAction(Intent.ACTION_VIEW).setData(uri)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pending = PendingIntent.getActivity(this, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(this, CHANNEL).setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("KROW · Actualización de viaje")
            .setContentText("Abre tu viaje para consultar la información actual.")
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setContentIntent(pending)
            .addAction(0, "Ver viaje", pending).setAutoCancel(true).setTimeoutAfter(remaining)
            .setPriority(NotificationCompat.PRIORITY_HIGH).build()
        try { NotificationManagerCompat.from(this).notify(id, 1, notification) } catch (_: SecurityException) { /* Permission revoked after the check. */ }
    }
}
