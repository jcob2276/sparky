import ActivityKit
import Capacitor

final class SparkyBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WorkoutRestActivityPlugin())
    }
}

@objc(WorkoutRestActivityPlugin)
final class WorkoutRestActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "WorkoutRestActivityPlugin"
    let jsName = "WorkoutRestActivity"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    @objc func show(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *), ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve()
            return
        }
        guard let start = call.getDouble("startedAt"), let end = call.getDouble("endsAt"),
              start.isFinite, end.isFinite, let exercise = call.getString("exercise"), end > start else {
            call.reject("Invalid rest timer")
            return
        }

        let endsAt = Date(timeIntervalSince1970: end / 1000)
        let state = WorkoutRestAttributes.ContentState(
            startedAt: Date(timeIntervalSince1970: start / 1000),
            endsAt: endsAt,
            exercise: exercise,
            nextSet: call.getInt("nextSet")
        )

        Task { @MainActor in
            guard endsAt > .now else {
                call.resolve()
                return
            }
            let content = ActivityContent(state: state, staleDate: endsAt)
            do {
                if let current = Activity<WorkoutRestAttributes>.activities.first {
                    await current.update(content)
                } else {
                    _ = try Activity.request(attributes: WorkoutRestAttributes(), content: content, pushType: nil)
                }
                call.resolve()
            } catch {
                call.reject("Could not start workout rest activity", nil, error)
            }
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task { @MainActor in
            for activity in Activity<WorkoutRestAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }
}
