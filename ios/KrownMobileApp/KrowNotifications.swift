import Foundation
import UIKit
import UserNotifications
import React

@objc(KrowNotifications)
class KrowNotifications: NSObject {
  private static var requests: [UUID: (RCTPromiseResolveBlock, RCTPromiseRejectBlock)] = [:]
  static var pendingRide: String?
  @objc static func requiresMainQueueSetup() -> Bool { true }
  @objc func setSessionActive(_ active: Bool) {
    DispatchQueue.main.async {
      UserDefaults.standard.set(active, forKey: "krow.push.sessionActive")
      if !active {
        UIApplication.shared.unregisterForRemoteNotifications()
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
      }
    }
  }
  @objc func consumeRide(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    DispatchQueue.main.async { resolve(Self.pendingRide); Self.pendingRide = nil }
  }

  @objc func requestToken(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { allowed, _ in
      DispatchQueue.main.async {
        guard allowed else { reject("PUSH_PERMISSION", "Activa las notificaciones para recibir avisos del viaje", nil); return }
        let id = UUID()
        Self.requests[id] = (resolve, reject)
        UIApplication.shared.registerForRemoteNotifications()
        DispatchQueue.main.asyncAfter(deadline: .now() + 15) {
          if let request = Self.requests.removeValue(forKey: id) { request.1("PUSH_TIMEOUT", "No se pudo registrar el dispositivo", nil) }
        }
      }
    }
  }

  static func registered(_ token: Data) {
    let value = token.map { String(format: "%02x", $0) }.joined()
    let pending = requests; requests.removeAll()
    for request in pending.values { request.0(value) }
  }
  static func failed(_ error: Error) {
    let pending = requests; requests.removeAll()
    for request in pending.values { request.1("PUSH_REGISTRATION", "No se pudo registrar el dispositivo", error) }
  }
}
