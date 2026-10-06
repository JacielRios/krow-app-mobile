import Foundation
import React
import CoreLocation
import Combine
import CryptoKit
import Security
import MapboxMaps
import MapboxCommon
import Turf
import MapboxNavigationCore
import MapboxDirections

/// One engine per process. GPS never changes booking or stop business state.
@objc(KrowNavigation)
class KrowNavigation: RCTEventEmitter, CLLocationManagerDelegate {
  private var provider: MapboxNavigationProvider?
  private let locationManager = CLLocationManager()
  private var subscriptions = Set<AnyCancellable>()
  private var config: [String: Any]?
  private var sessionId: String?
  private var active = false
  private var hasListeners = false
  private var preparing = false
  private var generation = 0
  private var routing = false
  private var destination: String?
  private var lastSample = Date.distantPast
  private var lastRequest = Date.distantPast
  private var lastSpeed = 0.0
  private var permission: (RCTPromiseResolveBlock, RCTPromiseRejectBlock)?
  private let disk = DispatchQueue(label: "krow.navigation.journal")
  private let journal = KrowNavigationJournal()
  private var downloads: [Cancelable] = []
  private var transport: (rideId: String, endpoint: URL, token: String, expiresAt: Double)?
  private var uploading = false // Access only on the serial disk queue.
  private let redirectGuard = KrowNoRedirect()
  private lazy var uploadSession = URLSession(configuration: .ephemeral, delegate: redirectGuard, delegateQueue: nil)

  override static func requiresMainQueueSetup() -> Bool { true }
  override func supportedEvents() -> [String]! { ["krow.location", "krow.navigation", "krow.download"] }
  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }
  private func emit(_ name: String, _ value: [String: Any]) {
    DispatchQueue.main.async {
      if self.hasListeners { var event = value; event["rideId"] = self.config?["rideId"]; self.sendEvent(withName: name, body: event) }
    }
  }
  @MainActor private func engine(_ token: String) -> MapboxNavigationProvider {
    if let provider { return provider }
    MapboxOptions.accessToken = token
    // Default TileStore is shared with the React Native Mapbox map.
    let provider = MapboxNavigationProvider(coreConfig: CoreConfig(
      credentials: .init(accessToken: token),
      routingConfig: RoutingConfig(alternativeRoutesDetectionConfig: nil, fasterRouteDetectionConfig: nil,
                                   routeRefreshPeriod: nil, routingProviderSource: .hybrid, prefersOnlineRoute: false),
      locale: Locale(identifier: "es_MX"), disableBackgroundTrackingLocation: false,
      tilestoreConfig: .default, ttsConfig: .localOnly))
    self.provider = provider
    _ = provider.routeVoiceController
    provider.tripSession().navigationRoutes.sink { [weak self] routes in
      guard let points = routes?.mainRoute.route.shape?.coordinates else { return }
      self?.emit("krow.navigation", ["geometry": ["type": "LineString", "coordinates": points.map { [$0.longitude, $0.latitude] }], "provisional": true])
    }.store(in: &subscriptions)
    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
    locationManager.activityType = .automotiveNavigation
    locationManager.pausesLocationUpdatesAutomatically = false
    locationManager.allowsBackgroundLocationUpdates = true
    return provider
  }

  @objc func prepare(_ rideId: String, routeJson: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task { @MainActor in
      do {
        guard !active && !preparing else { throw KrowNavigationError.invalid("Detén la navegación antes de preparar otro recorrido") }
        guard var value = try JSONSerialization.jsonObject(with: Data(routeJson.utf8)) as? [String: Any],
              let token = value.removeValue(forKey: "accessToken") as? String, token.hasPrefix("pk."),
              let geometry = value["geometry"] as? [String: Any], let points = geometry["coordinates"] as? [[Double]],
              points.count >= 2, points.allSatisfy({ $0.count == 2 }) else { throw KrowNavigationError.invalid("Ruta o token de Mapbox inválido") }
        let engine = engine(token)
        let lat = points.map { $0[1] }.reduce(0,+) / Double(points.count)
        let dy = 10.0/111.0, dx = dy/max(0.1, cos(lat * .pi/180))
        let west = points.map { $0[0] }.min()! - dx, east = points.map { $0[0] }.max()! + dx
        let south = points.map { $0[1] }.min()! - dy, north = points.map { $0[1] }.max()! + dy
        let polygon = Polygon([[CLLocationCoordinate2D(latitude:south,longitude:west), CLLocationCoordinate2D(latitude:south,longitude:east), CLLocationCoordinate2D(latitude:north,longitude:east), CLLocationCoordinate2D(latitude:north,longitude:west), CLLocationCoordinate2D(latitude:south,longitude:west)]])
        let offline = OfflineManager()
        let descriptor = offline.createTilesetDescriptor(for: TilesetDescriptorOptions(styleURI: .streets, zoomRange: 0...16))
        guard let options = TileRegionLoadOptions(geometry: .polygon(polygon), descriptors: [descriptor, engine.getLatestNavigationTilesetDescriptor()], metadata: ["rideId": rideId], acceptExpired: false),
              let styleOptions = StylePackLoadOptions(glyphsRasterizationMode: .ideographsRasterizedLocally, metadata: nil, acceptExpired: false) else { throw KrowNavigationError.invalid("No se pudo preparar la región") }
        preparing = true
        downloads.append(offline.loadStylePack(for: .streets, loadOptions: styleOptions, progress: { _ in }, completion: { result in
          Task { @MainActor in
            switch result {
            case .failure(let error): self.preparing = false; reject("OFFLINE_STYLE", "No se descargó el estilo del mapa", error)
            case .success:
              self.downloads.append(engine.coreConfig.tilestoreConfig.navigatorLocation.tileStore.loadTileRegion(forId: "krow-\(rideId)", loadOptions: options, progress: { progress in
                self.emit("krow.download", ["completed": progress.completedResourceCount, "required": progress.requiredResourceCount])
              }, completion: { result in
                Task { @MainActor in
                  self.preparing = false
                  switch result {
                  case .failure(let error): reject("OFFLINE_TILES", "No se completó la descarga de mapas y navegación", error)
                  case .success:
                    value["rideId"] = rideId; value["ready"] = true
                    self.config = value
                    let saved = value
                    self.disk.async {
                      do { try self.journal.saveState(saved); resolve(["ready": true, "routeVersion": saved["routeVersion"] ?? 0]) }
                      catch { reject("OFFLINE_STORAGE", "No se guardó la preparación", error) }
                    }
                  }
                }
              }))
            }
          }
        }))
      } catch { preparing = false; reject("OFFLINE_PREPARE", error.localizedDescription, error) }
    }
  }
  @objc func restore(_ rideId: String, token: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    disk.async {
      do {
        let saved = try self.journal.state()
        Task { @MainActor in
          guard saved?["rideId"] as? String == rideId else { resolve(nil); return }
          let engine = self.engine(token); self.config = saved
          engine.coreConfig.tilestoreConfig.navigatorLocation.tileStore.tileRegion(forId: "krow-\(rideId)") { result in
            Task { @MainActor in
              var ready = false
              if case .success(let region) = result { ready = region.requiredResourceCount > 0 && region.completedResourceCount >= region.requiredResourceCount }
              self.config?["ready"] = ready
              resolve(["ready": ready, "routeVersion": saved?["routeVersion"] ?? 0, "sessionId": saved?["sessionId"] ?? NSNull()])
            }
          }
        }
      } catch { reject("RESTORE", "No se pudo recuperar la navegación", error) }
    }
  }
  @objc func start(_ rideId: String, sessionId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task { @MainActor in
      guard config?["rideId"] as? String == rideId, config?["ready"] as? Bool == true else { reject("NAVIGATION_START", "Prepara los mapas del viaje", nil); return }
      self.sessionId = sessionId
      let previousSession = config?["sessionId"] as? String
      config?["sessionId"] = sessionId
      let saved = config!
      disk.async { do { if previousSession != sessionId { try self.journal.clear() }; try self.journal.saveState(saved) }
        catch { self.emit("krow.navigation", ["error": "No se pudo guardar la sesión local", "provisional": true]) } }
      if locationManager.authorizationStatus == .notDetermined {
        permission = (resolve,reject); locationManager.requestWhenInUseAuthorization(); return
      }
      begin(resolve, reject)
    }
  }
  @MainActor private func begin(_ resolve: RCTPromiseResolveBlock, _ reject: RCTPromiseRejectBlock) {
    guard [.authorizedAlways, .authorizedWhenInUse].contains(locationManager.authorizationStatus), locationManager.accuracyAuthorization == .fullAccuracy else { reject("LOCATION_PERMISSION", "Activa la ubicación precisa para navegar", nil); return }
    active = true; destination = nil; lastRequest = .distantPast
    locationManager.startUpdatingLocation(); provider?.tripSession().startFreeDrive(); resolve(nil)
  }
  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    Task { @MainActor in
      if let pending = permission, manager.authorizationStatus != .notDetermined { permission = nil; begin(pending.0,pending.1) }
      if active && ![.authorizedAlways,.authorizedWhenInUse].contains(manager.authorizationStatus) {
        active = false; provider?.tripSession().setToIdle(); manager.stopUpdatingLocation()
        emit("krow.navigation", ["error": "Permiso de ubicación revocado", "provisional": true])
      }
    }
  }
  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    Task { @MainActor in
      guard active, let fix = locations.last, fix.horizontalAccuracy >= 0, let sessionId else { return }
      let speed = max(0,fix.speed), interval: Double = speed < 0.5 ? 15 : speed < 3 ? 5 : 2
      if Date().timeIntervalSince(lastSample) >= interval || (speed >= 0.5 && lastSpeed < 0.5) {
        lastSample = Date(); lastSpeed = speed
        let sample: [String: Any] = ["sessionId": sessionId, "capturedAt": ISO8601DateFormatter().string(from: fix.timestamp), "lat": fix.coordinate.latitude, "lng": fix.coordinate.longitude, "accuracyMeters": fix.horizontalAccuracy, "speedMps": fix.speed >= 0 ? fix.speed as Any : NSNull(), "headingDegrees": fix.course >= 0 ? fix.course as Any : NSNull()]
        disk.async { do { try self.journal.append(sample); self.emit("krow.location", sample); self.upload() } catch { self.emit("krow.navigation", ["error": "No se guardó la ubicación", "provisional": true]) } }
      }
      if destination == nil { requestNext(fix) }
    }
  }
  @MainActor private func requestNext(_ fix: CLLocation) {
    guard active, !routing, fix.horizontalAccuracy <= 50, Date().timeIntervalSince(lastRequest) >= 15,
          let stop = (config?["stops"] as? [[String: Any]])?.first(where: { !["departed","skipped"].contains($0["state"] as? String ?? "") }),
          let id = stop["stopId"] as? String, let lat = stop["lat"] as? Double, let lng = stop["lng"] as? Double, let provider else { return }
    routing = true; lastRequest = Date(); generation += 1
    let expected = generation
    let options = NavigationRouteOptions(coordinates: [fix.coordinate, CLLocationCoordinate2D(latitude: lat,longitude: lng)])
    options.locale = Locale(identifier: "es_MX")
    options.includesAlternativeRoutes = false
    Task { @MainActor in
      do {
        let routes = try await provider.routingProvider().calculateRoutes(options: options).value
        guard expected == generation && active else { return }
        routing = false; destination = id
        provider.tripSession().startActiveGuidance(with: routes, startLegIndex: 0)
      } catch {
        guard expected == generation else { return }
        routing = false
        emit("krow.navigation", ["error": "No se pudo recalcular. Revisa la región descargada.", "provisional": true])
      }
    }
  }
  @objc func updateStops(_ rideId: String, stopsJson: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task { @MainActor in
      do {
        if config?["rideId"] as? String == rideId, let stops = try JSONSerialization.jsonObject(with: Data(stopsJson.utf8)) as? [[String: Any]] {
          config?["stops"] = stops
          let saved = config!
          disk.async { try? self.journal.saveState(saved) }
          let next = stops.first { !["departed","skipped"].contains($0["state"] as? String ?? "") }?["stopId"] as? String
          if next != destination { generation += 1; routing = false; destination = nil; lastRequest = .distantPast
            if active { provider?.tripSession().startFreeDrive(); if let fix = locationManager.location { requestNext(fix) } }
          }
        }
        resolve(nil)
      } catch { reject("NAVIGATION_STOPS", "No se pudo actualizar la siguiente parada", error) }
    }
  }
  @objc func stop(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task { @MainActor in
      active = false; sessionId = nil; generation += 1; destination = nil; routing = false
      provider?.tripSession().setToIdle(); locationManager.stopUpdatingLocation()
      config = nil
      disk.async { do { self.transport = nil; try self.journal.clear(); resolve(nil) } catch { reject("NAVIGATION_STOP", "No se pudo limpiar la sesión", error) } }
    }
  }
  @objc func drainLocations(_ rideId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    disk.async { do {
      guard try self.journal.state()?["rideId"] as? String == rideId else { resolve([]); return }
      resolve(try self.journal.drain())
    } catch { reject("LOCATION_QUEUE", "No se pudo leer la cola", error) } }
  }
  @objc func acknowledgeLocations(_ sequence: Double, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    disk.async { do { try self.journal.acknowledge(Int64(sequence)); resolve(nil) } catch { reject("LOCATION_QUEUE", "No se pudo confirmar la cola", error) } }
  }
  @objc func configureTransport(_ rideId: String, endpoint: String, token: String, expiresAt: Double, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let url = URL(string: endpoint), url.path == "/v2/rides/\(rideId)/locations", url.query == nil, url.user == nil else { reject("UPLOAD_CONFIG", "Destino de telemetría inválido", nil); return }
    var allowed = url.scheme == "https"
    #if DEBUG
    allowed = allowed || (url.scheme == "http" && ["localhost", "127.0.0.1"].contains(url.host ?? ""))
    #endif
    guard allowed else { reject("UPLOAD_CONFIG", "La telemetría requiere HTTPS", nil); return }
    disk.async { self.transport = (rideId,url,token,expiresAt); self.upload(); resolve(nil) }
  }
  private func upload() {
    guard !uploading, let transport, transport.expiresAt > Date().timeIntervalSince1970 * 1000 else { return }
    do {
      guard try journal.state()?["rideId"] as? String == transport.rideId else { return }
      let samples = try journal.drain()
      guard let sequence = (samples.last?["sequence"] as? NSNumber)?.int64Value else { return }
      var request = URLRequest(url: transport.endpoint, timeoutInterval: 10)
      request.httpMethod = "POST"; request.setValue("Bearer \(transport.token)", forHTTPHeaderField: "Authorization")
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.httpBody = try JSONSerialization.data(withJSONObject: ["samples": samples])
      uploading = true
      uploadSession.dataTask(with: request) { data,response,error in
        self.disk.async {
          defer { self.uploading = false }
          guard error == nil, let http = response as? HTTPURLResponse else { return }
          if [401,403].contains(http.statusCode) { self.transport = nil; self.emit("krow.navigation", ["error": "Abre el viaje para renovar la sesión de ubicación", "provisional": true]); return }
          if (200..<300).contains(http.statusCode), let data, let value = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], value["durable"] as? Bool == true, value["accepted"] as? Int == samples.count { try? self.journal.acknowledge(sequence) }
        }
      }.resume()
    } catch { /* Encrypted samples stay queued for a later location tick. */ }
  }
}

private final class KrowNoRedirect: NSObject, URLSessionTaskDelegate {
  func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}

private enum KrowNavigationError: LocalizedError {
  case invalid(String)
  var errorDescription: String? { switch self { case .invalid(let text): return text } }
}

/// Atomic encrypted records, protected after first unlock for active background navigation.
private final class KrowNavigationJournal {
  private let root = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("KrowNavigation", isDirectory: true)
  private func key() throws -> SymmetricKey {
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "krow.navigation.key", kSecAttrAccount as String: "v1"]
    var result: CFTypeRef?
    var read = query; read[kSecReturnData as String] = true
    let status = SecItemCopyMatching(read as CFDictionary, &result)
    if status == errSecSuccess, let data = result as? Data { return SymmetricKey(data: data) }
    guard status == errSecItemNotFound else { throw KrowNavigationError.invalid("Keychain no disponible") }
    let key = SymmetricKey(size: .bits256)
    var add = query; add[kSecValueData as String] = key.withUnsafeBytes { Data($0) }; add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    guard SecItemAdd(add as CFDictionary, nil) == errSecSuccess else { throw KrowNavigationError.invalid("No se pudo guardar la clave local") }
    return key
  }
  private func save(_ value: [String: Any], _ name: String) throws {
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    var excluded = root; var values = URLResourceValues(); values.isExcludedFromBackup = true; try excluded.setResourceValues(values)
    let encrypted = try AES.GCM.seal(JSONSerialization.data(withJSONObject: value), using: key()).combined!
    try encrypted.write(to: root.appendingPathComponent(name), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }
  private func read(_ url: URL) throws -> [String: Any] {
    let plain = try AES.GCM.open(AES.GCM.SealedBox(combined: Data(contentsOf: url)), using: key())
    return try JSONSerialization.jsonObject(with: plain) as! [String: Any]
  }
  func saveState(_ state: [String: Any]) throws { try save(state, "state") }
  func state() throws -> [String: Any]? { let url = root.appendingPathComponent("state"); return FileManager.default.fileExists(atPath: url.path) ? try read(url) : nil }
  private func records() throws -> [URL] {
    guard FileManager.default.fileExists(atPath: root.path) else { return [] }
    return try FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: nil).filter { $0.pathExtension == "sample" }.sorted { $0.lastPathComponent < $1.lastPathComponent }
  }
  func append(_ value: [String: Any]) throws {
    let counter = root.appendingPathComponent("counter")
    let last = FileManager.default.fileExists(atPath: counter.path) ? ((try read(counter)["sequence"] as? NSNumber)?.int64Value ?? 0) : 0
    let sequence = last + 1
    try save(["sequence": sequence], "counter") // Persist before sample: gaps are safe, reuse is not.
    var sample = value; sample["sequence"] = sequence
    try save(sample, String(format: "%020lld.sample", sequence))
    if sequence % 100 == 0 {
      let cutoff = Date().addingTimeInterval(-86400)
      let files = try records()
      for (index,file) in files.enumerated() {
        let date = try file.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate ?? .distantPast
        if index < files.count-86400 || date < cutoff { try FileManager.default.removeItem(at: file) }
      }
    }
  }
  func drain() throws -> [[String: Any]] {
    var result: [[String: Any]] = []
    for file in try records() {
      let date = try file.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate ?? .distantPast
      if date < Date().addingTimeInterval(-86400) { try FileManager.default.removeItem(at: file); continue }
      result.append(try read(file))
      if result.count == 100 { break }
    }
    return result
  }
  func acknowledge(_ sequence: Int64) throws {
    for file in try records() where (Int64(file.deletingPathExtension().lastPathComponent) ?? Int64.max) <= sequence { try FileManager.default.removeItem(at: file) }
  }
  func clear() throws {
    for file in try records() { try FileManager.default.removeItem(at: file) }
    let state = root.appendingPathComponent("state")
    if FileManager.default.fileExists(atPath: state.path) { try FileManager.default.removeItem(at: state) }
  }
}
