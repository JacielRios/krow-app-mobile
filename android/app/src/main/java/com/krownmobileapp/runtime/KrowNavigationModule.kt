package com.krownmobileapp.runtime

import android.Manifest
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.mapbox.common.TileStore
import com.mapbox.common.MapboxOptions
import com.mapbox.common.TileRegionLoadOptions
import com.mapbox.common.location.Location
import com.mapbox.geojson.Point
import com.mapbox.geojson.Polygon
import com.mapbox.geojson.LineString
import com.mapbox.maps.*
import com.mapbox.api.directions.v5.models.RouteOptions
import com.mapbox.navigation.base.extensions.applyDefaultNavigationOptions
import com.mapbox.navigation.base.options.NavigationOptions
import com.mapbox.navigation.base.options.RoutingTilesOptions
import com.mapbox.navigation.base.route.*
import com.mapbox.navigation.core.MapboxNavigation
import com.mapbox.navigation.core.MapboxNavigationProvider
import com.mapbox.navigation.core.trip.session.LocationObserver
import com.mapbox.navigation.core.trip.session.LocationMatcherResult
import com.mapbox.navigation.core.arrival.ArrivalController
import com.mapbox.navigation.base.trip.model.RouteLegProgress
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.net.HttpURLConnection
import java.net.URI
import kotlin.math.cos

/** SDK routing is local/provisional; only KROW may change business state or committed stops. */
class KrowNavigationModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val main = Handler(Looper.getMainLooper())
    private val disk = Executors.newSingleThreadExecutor()
    private val journal = NavigationJournal(context)
    private val network = Executors.newSingleThreadExecutor()
    private val uploading = AtomicBoolean(false)
    @Volatile private var transport: UploadTransport? = null
    private data class UploadTransport(val rideId: String, val url: String, val token: String, val expiresAt: Long)
    private var nav: MapboxNavigation? = null
    private var data: JSONObject? = null
    private var store: TileStore? = null
    private var active = false
    private var session: String? = null
    private var lastLocation: Location? = null
    private var lastSample = 0L
    private var lastSpeed = 0.0
    private var routing = false
    private var offRoute = false
    private var routeGeneration = 0
    private var lastRouteRequest = 0L
    private var destination: String? = null
    private var proximityAnnounced: String? = null
    private var voice: TextToSpeech? = null
    private var voiceReady = false
    private var preparation = false

    override fun getName() = "KrowNavigation"
    @ReactMethod fun addListener(name: String) = Unit
    @ReactMethod fun removeListeners(count: Int) = Unit
    private fun emit(name: String, payload: JSONObject) {
        payload.put("rideId", data?.optString("rideId"))
        if (context.hasActiveReactInstance()) context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, Arguments.makeNativeMap(jsonMap(payload)))
    }
    private fun jsonMap(value: JSONObject): Map<String, Any?> = value.keys().asSequence().associateWith { key ->
        fun unwrap(v: Any?): Any? = when (v) {
            JSONObject.NULL -> null
            is JSONObject -> jsonMap(v)
            is JSONArray -> (0 until v.length()).map { i -> unwrap(v.get(i)) }
            else -> v
        }
        unwrap(value.get(key))
    }
    private fun failure(message: String) = emit("krow.navigation", JSONObject().put("error", message).put("provisional", true))
    private fun engine(token: String): MapboxNavigation {
        nav?.let { return it }
        MapboxOptions.accessToken = token
        // Shared default store: RN MapView may exist before navigation preparation.
        val tiles = TileStore.create()
        store = tiles
        MapboxMapsOptions.tileStore = tiles
        return MapboxNavigationProvider.create(NavigationOptions.Builder(context)
            .routingTilesOptions(RoutingTilesOptions.Builder().tileStore(tiles).build()).build()).also { engine ->
            nav = engine
            engine.setRerouteEnabled(false)
            engine.setContinuousAlternativesEnabled(false)
            engine.setArrivalController(object : ArrivalController {
                override fun navigateNextRouteLeg(routeLegProgress: RouteLegProgress) = false
            })
            engine.registerLocationObserver(object : LocationObserver {
                override fun onNewRawLocation(rawLocation: Location) {
                    if (!active) return
                    lastLocation = rawLocation
                    val now = System.currentTimeMillis()
                    val speed = rawLocation.speed ?: 0.0
                    val interval = when { speed < 0.5 -> 15000; speed < 3 -> 5000; else -> 2000 }
                    if (now-lastSample >= interval || (speed >= 0.5 && lastSpeed < 0.5)) {
                        lastSample = now; lastSpeed = speed
                        val sample = JSONObject().put("sessionId", session)
                            .put("capturedAt", Instant.ofEpochMilli(rawLocation.timestamp).toString())
                            .put("lat", rawLocation.latitude).put("lng", rawLocation.longitude)
                            .put("accuracyMeters", rawLocation.horizontalAccuracy ?: 999.0)
                            .put("speedMps", rawLocation.speed ?: JSONObject.NULL)
                            .put("headingDegrees", rawLocation.bearing ?: JSONObject.NULL)
                        disk.execute {
                            try { journal.append(sample); emit("krow.location", sample); upload() }
                            catch (_: Exception) { failure("No se pudo guardar la ubicación en este dispositivo") }
                        }
                    }
                    if (destination == null || offRoute) requestNext()
                }
                override fun onNewLocationMatcherResult(locationMatcherResult: LocationMatcherResult) = Unit
            })
            engine.registerOffRouteObserver { deviated -> offRoute = deviated; if (deviated && active) requestNext() }
            engine.registerRouteProgressObserver { progress ->
                val instruction = progress.currentLegProgress?.currentStepProgress?.step?.maneuver()?.instruction()
                val distance = progress.currentLegProgress?.distanceRemaining
                emit("krow.navigation", JSONObject().put("instruction", instruction ?: "")
                    .put("remainingMeters", distance ?: JSONObject.NULL).put("provisional", true))
                val next = pendingStop()
                if (distance != null && distance <= 500 && next != null && proximityAnnounced != next.getString("stopId")) {
                    proximityAnnounced = next.getString("stopId")
                    val alert = "Próxima parada. Suben ${next.optInt("pickups")}, bajan ${next.optInt("dropoffs")}"
                    emit("krow.navigation", JSONObject().put("instruction", alert).put("provisional", true))
                    if (voiceReady) voice?.speak(alert, TextToSpeech.QUEUE_ADD, null, "stop")
                }
            }
            engine.registerVoiceInstructionsObserver { instruction ->
                val text = instruction.announcement()
                if (voiceReady) voice?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "maneuver")
            }
            voice = TextToSpeech(context) { status ->
                val installed = voice?.voices?.firstOrNull { it.locale.language == "es" && !it.isNetworkConnectionRequired }
                voiceReady = status == TextToSpeech.SUCCESS && installed != null
                if (installed != null) voice?.voice = installed
                else failure("Instala una voz en español sin conexión para escuchar las indicaciones offline")
            }
        }
    }
    @ReactMethod fun prepare(rideId: String, routeJson: String, promise: Promise) {
      main.post {
        try {
            check(!active && !preparation) { "Detén la navegación antes de preparar otro recorrido" }
            val config = JSONObject(routeJson)
            val token = config.getString("accessToken")
            require(token.startsWith("pk.")) { "Falta el token público de Mapbox" }
            val engine = engine(token)
            val coordinates = config.getJSONObject("geometry").getJSONArray("coordinates")
            require(coordinates.length() >= 2)
            val points = (0 until coordinates.length()).map { coordinates.getJSONArray(it).let { p -> Point.fromLngLat(p.getDouble(0), p.getDouble(1)) } }
            val lat = points.map { it.latitude() }.average()
            val dy = 10.0 / 111.0; val dx = dy / cos(Math.toRadians(lat)).coerceAtLeast(0.1)
            val west = points.minOf { it.longitude() }-dx; val east = points.maxOf { it.longitude() }+dx
            val south = points.minOf { it.latitude() }-dy; val north = points.maxOf { it.latitude() }+dy
            val polygon = Polygon.fromLngLats(listOf(listOf(Point.fromLngLat(west,south),Point.fromLngLat(east,south),Point.fromLngLat(east,north),Point.fromLngLat(west,north),Point.fromLngLat(west,south))))
            val offline = OfflineManager()
            val mapDescriptor = offline.createTilesetDescriptor(TilesetDescriptorOptions.Builder().styleURI(Style.MAPBOX_STREETS).minZoom(0).maxZoom(16).build())
            preparation = true
            val options = TileRegionLoadOptions.Builder().geometry(polygon)
                .descriptors(listOf(mapDescriptor, engine.tilesetDescriptorFactory.getLatest())).acceptExpired(false).build()
            offline.loadStylePack(Style.MAPBOX_STREETS, StylePackLoadOptions.Builder().build(), {}, { styleResult ->
                if (styleResult.isError) { main.post { preparation = false; promise.reject("OFFLINE_STYLE", "No se descargó el estilo del mapa") } }
                else store!!.loadTileRegion("krow-$rideId", options, { progress ->
                    emit("krow.download", JSONObject().put("completed", progress.completedResourceCount).put("required", progress.requiredResourceCount))
                }, { result -> main.post {
                    preparation = false
                    if (result.isError) promise.reject("OFFLINE_TILES", "No se completó la descarga de mapas y navegación")
                    else {
                        config.remove("accessToken")
                        config.put("rideId", rideId).put("ready", true)
                        val previousRide = data?.optString("rideId")
                        data = config
                        disk.execute {
                            try {
                                if (previousRide != rideId) journal.clear()
                                journal.saveState(config)
                                promise.resolve(Arguments.createMap().apply { putBoolean("ready", true); putInt("routeVersion", config.getInt("routeVersion")) })
                            } catch (e: Exception) { config.put("ready", false); promise.reject("OFFLINE_STORAGE", e.message, e) }
                        }
                    }
                } })
            })
        } catch (error: Exception) { preparation = false; promise.reject("OFFLINE_PREPARE", error.message, error) }
        Unit
      }
    }
    @ReactMethod fun restore(rideId: String, token: String, promise: Promise) {
        disk.execute {
            try {
                val saved = journal.state()
                main.post {
                    try {
                        if (saved?.optString("rideId") != rideId) { promise.resolve(null); return@post }
                        engine(token); data = saved
                        store!!.getTileRegion("krow-$rideId") { result ->
                            val region = result.value
                            val ready = !result.isError && region != null && region.completedResourceCount >= region.requiredResourceCount && region.requiredResourceCount > 0
                            saved.put("ready", ready)
                            promise.resolve(Arguments.createMap().apply {
                                putInt("routeVersion", saved.getInt("routeVersion")); putBoolean("ready", ready)
                                if (saved.has("sessionId")) putString("sessionId", saved.getString("sessionId"))
                            })
                        }
                    } catch (e: Exception) { promise.reject("RESTORE", e.message, e) }
                }
            } catch (e: Exception) { promise.reject("RESTORE", e.message, e) }
        }
    }
    @ReactMethod fun start(rideId: String, sessionId: String, promise: Promise) {
      main.post {
        try {
            check(context.currentActivity != null) { "Abre la aplicación para iniciar navegación" }
            check(ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) { "Se necesita ubicación precisa" }
            check(data?.optString("rideId") == rideId && data?.optBoolean("ready") == true) { "Prepara los mapas del viaje" }
            if (active && session == sessionId) { promise.resolve(null); return@post }
            check(!active) { "Ya hay una sesión de navegación activa" }
            session = sessionId; active = true; destination = null; lastSample = 0
            val generation = ++routeGeneration
            val previousSession = data!!.optString("sessionId")
            data!!.put("sessionId", sessionId)
            val saved = JSONObject(data.toString())
            disk.execute {
                try {
                    if (previousSession != sessionId) journal.clear()
                    journal.saveState(saved)
                    main.post {
                        try {
                            check(generation == routeGeneration && active) { "Inicio de navegación cancelado" }
                            nav!!.startTripSession(); promise.resolve(null)
                        } catch (e: Exception) { active = false; promise.reject("NAVIGATION_START", e.message, e) }
                    }
                } catch (e: Exception) { main.post { active = false; promise.reject("NAVIGATION_STORAGE", e.message, e) } }
            }
        } catch (e: Exception) { active = false; promise.reject("NAVIGATION_START", e.message, e) }
        Unit
      }
    }
    @ReactMethod fun updateStops(rideId: String, stopsJson: String, promise: Promise) {
      main.post {
        try {
            if (data?.optString("rideId") == rideId) {
                val stops = JSONArray(stopsJson)
                data!!.put("stops", stops)
                val saved = JSONObject(data.toString())
                disk.execute { try { journal.saveState(saved) } catch (_: Exception) { failure("No se pudo guardar el avance local de las paradas") } }
                val next = pendingStop()?.getString("stopId")
                if (next != destination) { destination = null; routeGeneration++; routing = false; lastRouteRequest = 0; nav?.setNavigationRoutes(emptyList()); requestNext() }
            }
            promise.resolve(null)
        } catch (e: Exception) { promise.reject("NAVIGATION_STOPS", e.message, e) }
        Unit
      }
    }
    private fun pendingStop(): JSONObject? {
        val stops = data?.optJSONArray("stops") ?: return null
        return (0 until stops.length()).map { stops.getJSONObject(it) }.firstOrNull { it.getString("state") !in listOf("departed", "skipped") }
    }
    private fun requestNext() {
        val location = lastLocation ?: return
        val stop = pendingStop() ?: return
        if (!active || routing || System.currentTimeMillis()-lastRouteRequest < 15000 || (location.horizontalAccuracy ?: 999.0) > 50) return
        lastRouteRequest = System.currentTimeMillis(); routing = true
        val generation = ++routeGeneration
        // Exactly the next committed stop; later stops cannot be skipped by automatic SDK arrivals.
        val options = RouteOptions.builder().applyDefaultNavigationOptions().language("es").voiceUnits("metric")
            .coordinatesList(listOf(Point.fromLngLat(location.longitude, location.latitude), Point.fromLngLat(stop.getDouble("lng"),stop.getDouble("lat"))))
            .alternatives(false).build()
        nav!!.requestRoutes(options, object : NavigationRouterCallback {
            override fun onRoutesReady(routes: List<NavigationRoute>, routerOrigin: String) {
                if (generation != routeGeneration || !active) return
                routing = false; destination = stop.getString("stopId")
                nav!!.setNavigationRoutes(routes.take(1))
                val geometry = routes.first().directionsRoute.geometry()
                if (geometry != null) emit("krow.navigation", JSONObject().put("geometry", JSONObject(LineString.fromPolyline(geometry, 6).toJson())).put("provisional", true).put("source", routerOrigin))
            }
            override fun onFailure(reasons: List<RouterFailure>, routeOptions: RouteOptions) {
                if (generation != routeGeneration) return
                routing = false; failure("No se pudo recalcular. Conserva el último recorrido y revisa la cobertura descargada.")
            }
            override fun onCanceled(routeOptions: RouteOptions, routerOrigin: String) { if (generation == routeGeneration) routing = false }
        })
    }
    @ReactMethod fun stop(promise: Promise) {
      main.post {
        active = false; session = null; routeGeneration++; routing = false; offRoute = false; destination = null; transport = null
        data = null
        nav?.stopTripSession(); nav?.setNavigationRoutes(emptyList()); voice?.stop()
        disk.execute { try { journal.clear(); promise.resolve(null) } catch (e: Exception) { promise.reject("NAVIGATION_STOP", e.message, e) } }
      }
    }
    @ReactMethod fun drainLocations(rideId: String, promise: Promise) { disk.execute {
        try { val values = if (journal.state()?.optString("rideId") == rideId) journal.drain() else JSONArray(); promise.resolve(Arguments.makeNativeArray((0 until values.length()).map { jsonMap(values.getJSONObject(it)) })) }
        catch (e: Exception) { promise.reject("LOCATION_QUEUE", e.message, e) }
    } }
    @ReactMethod fun acknowledgeLocations(sequence: Double, promise: Promise) { disk.execute {
        try { journal.acknowledge(sequence.toLong()); promise.resolve(null) } catch (e: Exception) { promise.reject("LOCATION_QUEUE", e.message, e) }
    } }
    @ReactMethod fun configureTransport(rideId: String, endpoint: String, token: String, expiresAt: Double, promise: Promise) {
        try {
            val url = URI(endpoint)
            require(url.scheme == "https" || (com.krownmobileapp.BuildConfig.DEBUG && url.scheme == "http" && url.host in listOf("127.0.0.1", "localhost", "10.0.2.2")))
            require(url.path == "/v2/rides/$rideId/locations" && url.rawQuery == null && url.userInfo == null)
            transport = UploadTransport(rideId, endpoint, token, expiresAt.toLong())
            upload(); promise.resolve(null)
        } catch (e: Exception) { promise.reject("UPLOAD_CONFIG", "Destino de telemetría inválido", e) }
    }
    private fun upload() {
        val settings = transport ?: return
        if (settings.expiresAt <= System.currentTimeMillis() || !uploading.compareAndSet(false, true)) return
        network.execute {
            try {
                if (journal.state()?.optString("rideId") != settings.rideId) return@execute
                val samples = journal.drain()
                if (samples.length() == 0) return@execute
                val connection = URI(settings.url).toURL().openConnection() as HttpURLConnection
                try {
                    connection.requestMethod = "POST"; connection.instanceFollowRedirects = false
                    connection.connectTimeout = 5000; connection.readTimeout = 5000; connection.doOutput = true
                    connection.setRequestProperty("Authorization", "Bearer ${settings.token}")
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.outputStream.use { it.write(JSONObject().put("samples", samples).toString().toByteArray(Charsets.UTF_8)) }
                    if (connection.responseCode in 200..299) {
                        val response = connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
                        if (response.optBoolean("durable") && response.optInt("accepted") == samples.length())
                            journal.acknowledge(samples.getJSONObject(samples.length()-1).getLong("sequence"))
                    } else if (connection.responseCode in listOf(401,403)) {
                        transport = null; failure("Abre el viaje para renovar la sesión de ubicación")
                    }
                } finally { connection.disconnect() }
            } catch (_: Exception) { /* Bounded durable queue retains samples until a future location tick. */ }
            finally { uploading.set(false) }
        }
    }
    override fun invalidate() {
        main.post { active = false; nav?.stopTripSession(); MapboxNavigationProvider.destroy(); nav = null; voice?.shutdown() }
        super.invalidate()
    }
}
