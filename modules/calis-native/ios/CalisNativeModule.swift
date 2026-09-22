import ExpoModulesCore
import HealthKit

public class CalisNativeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CalisNative")

    OnCreate {
      NSLog(
        "[CALIS Health] CalisNative module loaded; isHealthDataAvailable=%@",
        HKHealthStore.isHealthDataAvailable() ? "true" : "false"
      )
    }

    Function("setAppearancePreference") { (value: String) in
      UserDefaults.standard.set(value, forKey: CalisAppearance.preferenceKey)
      CalisAppearance.applyToAllWindowsEventually()
    }

    Function("getAppearancePreference") { () -> String in
      UserDefaults.standard.string(forKey: CalisAppearance.preferenceKey) ?? "system"
    }

    AsyncFunction("setAppIcon") { (name: String?) async throws in
      try await CalisIcons.set(name)
    }

    Function("getAppIcon") { () -> String in
      CalisIcons.currentPreferenceUnisolated()
    }

    Function("isHealthAvailable") { () -> Bool in
      let available = HKHealthStore.isHealthDataAvailable()
      NSLog(
        "[CALIS Health] isHealthAvailable() HKHealthStore.isHealthDataAvailable()=%@",
        available ? "true" : "false"
      )
      return available
    }

    Function("getWorkoutAuthorizationStatus") { () -> String in
      CalisHealth.authorizationStatus()
    }

    AsyncFunction("requestWorkoutAuthorization") { () async -> String in
      await CalisHealth.requestAuthorization()
    }

    AsyncFunction("saveWorkout") { (payload: [String: Any], promise: Promise) in
      guard let request = CalisHealth.parse(payload) else {
        promise.resolve(["ok": "false", "error": "invalid-dates"] as [String: String])
        return
      }
      Task {
        let result = await CalisHealth.save(request)
        promise.resolve(result)
      }
    }
  }
}

private enum CalisAppearance {
  static let preferenceKey = "calis.appearance"

  static func applyToAllWindowsEventually() {
    Task { @MainActor in
      applyToAllWindows()
    }
  }

  @MainActor
  static func applyToAllWindows() {
    let style: UIUserInterfaceStyle
    switch UserDefaults.standard.string(forKey: preferenceKey) {
    case "light":
      style = .light
    case "dark":
      style = .dark
    default:
      style = .unspecified
    }

    for scene in UIApplication.shared.connectedScenes {
      guard let windowScene = scene as? UIWindowScene else { continue }
      for window in windowScene.windows {
        window.overrideUserInterfaceStyle = style
      }
    }
  }
}

private enum CalisIcons {
  static let darkIconName = "AppIconDark"

  @MainActor
  static func currentPreference() -> String {
    UIApplication.shared.alternateIconName == darkIconName ? "dark" : "light"
  }

  static func currentPreferenceUnisolated() -> String {
    if Thread.isMainThread {
      return MainActor.assumeIsolated {
        currentPreference()
      }
    }
    return DispatchQueue.main.sync {
      MainActor.assumeIsolated {
        currentPreference()
      }
    }
  }

  @MainActor
  static func set(_ preference: String?) async throws {
    let targetName: String? = preference == "dark" ? darkIconName : nil
    let application = UIApplication.shared

    if application.alternateIconName == targetName {
      return
    }
    if !application.supportsAlternateIcons {
      return
    }

    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      application.setAlternateIconName(targetName) { error in
        if let error {
          continuation.resume(throwing: error)
        } else {
          continuation.resume()
        }
      }
    }
  }
}

private struct CalisWorkoutSaveRequest: Sendable {
  let startMs: Double
  let endMs: Double
  let sessionId: String?
  let title: String?
}

private enum CalisHealth {
  static func authorizationStatus() -> String {
    guard HKHealthStore.isHealthDataAvailable() else {
      return "unavailable"
    }

    switch HKHealthStore().authorizationStatus(for: HKObjectType.workoutType()) {
    case .sharingAuthorized:
      return "authorized"
    case .sharingDenied:
      return "denied"
    case .notDetermined:
      return "notDetermined"
    @unknown default:
      return "notDetermined"
    }
  }

  static func requestAuthorization() async -> String {
    guard HKHealthStore.isHealthDataAvailable() else {
      return "unavailable"
    }

    let workout = HKObjectType.workoutType()
    do {
      try await Task { @MainActor in
        try await HKHealthStore().requestAuthorization(toShare: [workout], read: [])
      }.value
    } catch {
      return authorizationStatus()
    }
    return authorizationStatus()
  }

  static func parse(_ payload: [String: Any]) -> CalisWorkoutSaveRequest? {
    guard
      let startMs = doubleValue(payload["startDate"]),
      let endMs = doubleValue(payload["endDate"]),
      endMs > startMs
    else {
      return nil
    }

    let metadata = payload["metadata"] as? [String: Any]
    return CalisWorkoutSaveRequest(
      startMs: startMs,
      endMs: endMs,
      sessionId: metadata?["sessionId"] as? String,
      title: metadata?["title"] as? String
    )
  }

  static func save(_ request: CalisWorkoutSaveRequest) async -> [String: String] {
    guard HKHealthStore.isHealthDataAvailable() else {
      return ["ok": "false", "error": "unavailable"]
    }

    let store = HKHealthStore()
    guard store.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized else {
      return ["ok": "false", "error": "denied"]
    }

    let start = Date(timeIntervalSince1970: request.startMs / 1000)
    let end = Date(timeIntervalSince1970: request.endMs / 1000)

    let configuration = HKWorkoutConfiguration()
    configuration.activityType = .functionalStrengthTraining
    configuration.locationType = .indoor

    let builder = HKWorkoutBuilder(healthStore: store, configuration: configuration, device: .local())
    var metadata: [String: Any] = [
      HKMetadataKeyIndoorWorkout: true,
    ]

    if let sessionId = request.sessionId, !sessionId.isEmpty {
      metadata[HKMetadataKeySyncIdentifier] = sessionId
      metadata[HKMetadataKeySyncVersion] = 1
    }
    if let title = request.title, !title.isEmpty {
      metadata[HKMetadataKeyWorkoutBrandName] = "CALIS"
      metadata["calis_workout_title"] = title
    }

    do {
      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        builder.beginCollection(withStart: start) { success, error in
          if let error {
            continuation.resume(throwing: error)
          } else if success {
            continuation.resume()
          } else {
            continuation.resume(throwing: NSError(
              domain: "app.calis.health",
              code: 1,
              userInfo: [NSLocalizedDescriptionKey: "Unable to begin HealthKit workout"]
            ))
          }
        }
      }

      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        builder.addMetadata(metadata) { success, error in
          if let error {
            continuation.resume(throwing: error)
          } else {
            continuation.resume()
          }
        }
      }

      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        builder.endCollection(withEnd: end) { success, error in
          if let error {
            continuation.resume(throwing: error)
          } else if success {
            continuation.resume()
          } else {
            continuation.resume(throwing: NSError(
              domain: "app.calis.health",
              code: 2,
              userInfo: [NSLocalizedDescriptionKey: "Unable to end HealthKit workout"]
            ))
          }
        }
      }

      _ = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<HKWorkout?, Error>) in
        builder.finishWorkout { workout, error in
          if let error {
            continuation.resume(throwing: error)
          } else {
            continuation.resume(returning: workout)
          }
        }
      }

      return ["ok": "true"]
    } catch {
      return ["ok": "false", "error": error.localizedDescription]
    }
  }

  static func doubleValue(_ value: Any?) -> Double? {
    if let number = value as? NSNumber {
      return number.doubleValue
    }
    if let number = value as? Double {
      return number
    }
    if let number = value as? Int {
      return Double(number)
    }
    return nil
  }
}
