import ActivityKit
import SwiftUI
import WidgetKit

struct WorkoutRestLiveActivity: Widget {
    private let workoutURL = URL(string: "sparky-widget://open/workout")

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutRestAttributes.self) { context in
            HStack(spacing: 14) {
                Image(systemName: "dumbbell.fill")
                    .font(.title3)
                    .foregroundStyle(.tint)
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 4) {
                    Text(context.state.hasRest ? "Przerwa między seriami" : "Trening")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    if let exercise = context.state.exercise, context.state.hasRest {
                        Text(exercise).font(.headline).lineLimit(2)
                        if let nextSet = context.state.nextSet {
                            Text("Następna seria: \(nextSet)").font(.caption).foregroundStyle(.secondary)
                        }
                    } else {
                        Text("Czas treningu").font(.headline)
                    }
                }

                Spacer(minLength: 4)
                VStack(alignment: .trailing, spacing: 2) {
                    workoutTimer(context).font(.title2.weight(.semibold))
                    if context.state.hasRest {
                        restCountdown(context).font(.subheadline.weight(.semibold)).foregroundStyle(.tint)
                    }
                }
                .frame(width: 84, alignment: .trailing)
            }
            .padding(16)
            .widgetURL(workoutURL)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    workoutTimer(context)
                        .font(.headline)
                        .frame(width: 62, alignment: .leading)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.hasRest {
                        restCountdown(context)
                            .font(.headline)
                            .foregroundStyle(.tint)
                            .frame(width: 62, alignment: .trailing)
                    } else {
                        Image(systemName: "dumbbell.fill").foregroundStyle(.tint).accessibilityHidden(true)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        if let exercise = context.state.exercise, context.state.hasRest {
                            Text(exercise).font(.headline).lineLimit(1)
                            if let nextSet = context.state.nextSet {
                                Text("Przerwa · następna seria: \(nextSet)").font(.caption).foregroundStyle(.secondary)
                            }
                        } else {
                            Text("Trening w toku").font(.headline)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } compactLeading: {
                // Po lewej zawsze czas całego treningu.
                workoutTimer(context)
                    .font(.caption.weight(.semibold))
                    .frame(width: 50, alignment: .leading)
            } compactTrailing: {
                if context.state.hasRest {
                    restCountdown(context)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.tint)
                        .frame(width: 44, alignment: .trailing)
                } else {
                    Image(systemName: "dumbbell.fill").accessibilityLabel("Sparky, trening")
                }
            } minimal: {
                if context.state.hasRest, let end = context.state.restEndsAt, let start = context.state.restStartedAt {
                    Text(timerInterval: start...end, countsDown: true)
                        .monospacedDigit()
                        .font(.caption2)
                        .minimumScaleFactor(0.6)
                } else {
                    Image(systemName: "dumbbell.fill").accessibilityLabel("Sparky, trening")
                }
            }
            .widgetURL(workoutURL)
        }
    }

    /// Stoper rosnący od startu treningu (przez 24 h).
    private func workoutTimer(_ context: ActivityViewContext<WorkoutRestAttributes>) -> some View {
        let start = context.state.workoutStartedAt
        return Text(timerInterval: start...start.addingTimeInterval(24 * 3600), countsDown: false)
            .monospacedDigit()
            .accessibilityLabel("Czas treningu")
    }

    private func restCountdown(_ context: ActivityViewContext<WorkoutRestAttributes>) -> some View {
        Group {
            if let start = context.state.restStartedAt, let end = context.state.restEndsAt {
                Text(timerInterval: start...end, countsDown: true)
            }
        }
        .monospacedDigit()
        .accessibilityLabel("Przerwa")
    }
}
