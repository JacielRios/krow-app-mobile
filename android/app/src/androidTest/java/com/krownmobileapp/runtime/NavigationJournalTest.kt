package com.krownmobileapp.runtime

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*
import org.json.JSONObject
import java.security.KeyStore
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class NavigationJournalTest {
    @Test fun encryptedQueueSurvivesReopenAndAcknowledgesOnlyPersistedRange() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val name = "test-navigation-${UUID.randomUUID()}.db"
        val alias = "test.krow.${UUID.randomUUID()}"
        var journal = NavigationJournal(context, name, alias)
        val secretMarker = "private-location-${UUID.randomUUID()}"
        try {
            journal.saveState(JSONObject().put("rideId", "test-ride").put("sessionId", secretMarker))
            repeat(103) { journal.append(JSONObject().put("sessionId", secretMarker).put("lat", 19.123456).put("lng", -99.123456)) }
            val firstBatch = journal.drain()
            assertEquals(100, firstBatch.length())
            val acknowledged = firstBatch.getJSONObject(99).getLong("sequence")
            journal.close()
            assertFalse(context.getDatabasePath(name).readBytes().toString(Charsets.ISO_8859_1).contains(secretMarker))
            journal = NavigationJournal(context, name, alias)
            assertEquals(secretMarker, journal.state()!!.getString("sessionId"))
            assertEquals(firstBatch.toString(), journal.drain().toString())
            journal.append(JSONObject().put("sessionId", secretMarker))
            journal.acknowledge(acknowledged)
            assertEquals(4, journal.drain().length())
            assertTrue(journal.drain().getJSONObject(0).getLong("sequence") > acknowledged)
            journal.clear()
            assertNull(journal.state())
            assertEquals(0, journal.drain().length())
            journal.append(JSONObject().put("sessionId", "new-session"))
            journal.acknowledge(acknowledged) // Late receipt from the previous session cannot erase the new sample.
            assertEquals(1, journal.drain().length())
        } finally {
            journal.close()
            context.deleteDatabase(name) // Exact test-owned database, never the application's journal.
            KeyStore.getInstance("AndroidKeyStore").apply { load(null); deleteEntry(alias) }
        }
    }
}
