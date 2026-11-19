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
        guard let workoutStart = call.getDouble("workoutStartedAt"), workoutStart.isFinite else {
            call.reject("Invalid workout start")
            return
        }

        var restStart: Date?
        var restEnd: Date?
        var exercise: String?
        var nextSet: Int?
        if let rest = call.getObject("rest") {
            guard let start = rest["startedAt"] as? Double, let end = rest["endsAt"] as? Double,
                  start.isFinite, end.isFinite, end > start, let name = rest["exercise"] as? String else {
                call.reject("Invalid rest timer")
                return
            }
            if end / 1000 > Date.now.timeIntervalSince1970 {
                restStart = Date(timeIntervalSince1970: start / 1000)
                restEnd = Date(timeIntervalSince1970: end / 1000)
                exercise = name
                nextSet = rest["nextSet"] as? Int
            }
        }

        let state = WorkoutRestAttributes.ContentState(
            workoutStartedAt: Date(timeIntervalSince1970: workoutStart / 1000),
            restStartedAt: restStart,
            restEndsAt: restEnd,
            exercise: exercise,
            nextSet: nextSet
        )

        Task { @MainActor in
            let content = ActivityContent(state: state, staleDate: nil)
            do {
                if let current = Activity<WorkoutRestAttributes>.activities.first {
                    await current.update(content)
                } else {
                    _ = try Activity.request(attributes: WorkoutRestAttributes(), content: content, pushType: nil)
                }
                call.resolve()
            } catch {
                call.reject("Could not start workout activity", nil, error)
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
