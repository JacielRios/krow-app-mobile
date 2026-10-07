package com.krownmobileapp.runtime

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Only ciphertext is written to SQLite, including its WAL. Sequence allocation is transactional. */
internal class NavigationJournal(context: Context, name: String = "krow-navigation.db", private val keyAlias: String = "krow.navigation.v1") : SQLiteOpenHelper(context, name, null, 1) {
    private val key: SecretKey by lazy {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(keyAlias, null) as? SecretKey) ?: KeyGenerator
            .getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
                init(KeyGenParameterSpec.Builder(keyAlias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
            }.generateKey()
    }
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE samples (sequence INTEGER PRIMARY KEY AUTOINCREMENT, captured INTEGER NOT NULL, payload BLOB NOT NULL)")
        db.execSQL("CREATE TABLE state (id INTEGER PRIMARY KEY CHECK(id=1), payload BLOB NOT NULL)")
    }
    override fun onUpgrade(db: SQLiteDatabase, old: Int, new: Int) = Unit
    private fun encrypt(value: String): ByteArray = Cipher.getInstance("AES/GCM/NoPadding").run {
        init(Cipher.ENCRYPT_MODE, key)
        iv + doFinal(value.toByteArray(Charsets.UTF_8))
    }
    private fun decrypt(value: ByteArray): String = Cipher.getInstance("AES/GCM/NoPadding").run {
        init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, value.copyOfRange(0, 12)))
        String(doFinal(value.copyOfRange(12, value.size)), Charsets.UTF_8)
    }
    @Synchronized fun saveState(value: JSONObject) {
        writableDatabase.insertWithOnConflict("state", null, ContentValues().apply {
            put("id", 1); put("payload", encrypt(value.toString()))
        }, SQLiteDatabase.CONFLICT_REPLACE)
    }
    @Synchronized fun state(): JSONObject? = readableDatabase.rawQuery("SELECT payload FROM state WHERE id=1", null).use {
        if (it.moveToFirst()) JSONObject(decrypt(it.getBlob(0))) else null
    }
    @Synchronized fun append(sample: JSONObject) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            db.insertOrThrow("samples", null, ContentValues().apply {
                put("captured", System.currentTimeMillis()); put("payload", encrypt(sample.toString()))
            })
            db.execSQL("DELETE FROM samples WHERE captured < ? OR sequence <= (SELECT COALESCE(MAX(sequence),0)-86400 FROM samples)", arrayOf(System.currentTimeMillis() - 86400000))
            db.setTransactionSuccessful()
        } finally { db.endTransaction() }
    }
    @Synchronized fun drain(): JSONArray = JSONArray().apply {
        readableDatabase.rawQuery("SELECT sequence,payload FROM samples ORDER BY sequence LIMIT 100", null).use {
            while (it.moveToNext()) put(JSONObject(decrypt(it.getBlob(1))).put("sequence", it.getLong(0)))
        }
    }
    @Synchronized fun acknowledge(sequence: Long) { writableDatabase.delete("samples", "sequence<=?", arrayOf(sequence.toString())) }
    @Synchronized fun prune(retentionMs: Long) { writableDatabase.delete("samples", "captured<?", arrayOf((System.currentTimeMillis() - retentionMs).toString())) }
    @Synchronized fun clear() {
        writableDatabase.delete("state", null, null)
        writableDatabase.delete("samples", null, null)
    }
}
