import ActivityKit
import Foundation

/// Live Activity treningu: stoper całej sesji + opcjonalna przerwa między seriami.
@available(iOS 16.1, *)
struct WorkoutRestAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        let workoutStartedAt: Date
        let restStartedAt: Date?
        let restEndsAt: Date?
        let exercise: String?
        let nextSet: Int?

        var hasRest: Bool { restStartedAt != nil && restEndsAt != nil }
    }
}
