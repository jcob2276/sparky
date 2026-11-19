import ActivityKit
import Foundation

@available(iOS 16.1, *)
struct WorkoutRestAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        let startedAt: Date
        let endsAt: Date
        let exercise: String
        let nextSet: Int?
    }
}
