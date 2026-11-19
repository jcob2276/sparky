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
                    Text(context.isStale ? "Koniec przerwy" : "Przerwa między seriami")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text(context.state.exercise)
                        .font(.headline)
                        .lineLimit(2)
                    if let nextSet = context.state.nextSet {
                        Text("Następna seria: \(nextSet)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer(minLength: 4)
                countdown(context)
                    .font(.title2.weight(.semibold))
                    .frame(width: 76, alignment: .trailing)
            }
            .padding(16)
            .widgetURL(workoutURL)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "dumbbell.fill")
                        .foregroundStyle(.tint)
                        .accessibilityHidden(true)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    countdown(context)
                        .font(.headline)
                        .frame(width: 62, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(context.state.exercise).font(.headline).lineLimit(1)
                        if let nextSet = context.state.nextSet {
                            Text("Następna seria: \(nextSet)").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } compactLeading: {
                Image(systemName: "dumbbell.fill").accessibilityLabel("Sparky, przerwa treningowa")
            } compactTrailing: {
                countdown(context)
                    .font(.caption.weight(.semibold))
                    .frame(width: 44, alignment: .trailing)
            } minimal: {
                Image(systemName: "timer").accessibilityLabel("Sparky, przerwa treningowa")
            }
            .widgetURL(workoutURL)
        }
    }

    private func countdown(_ context: ActivityViewContext<WorkoutRestAttributes>) -> some View {
        Group {
            if context.isStale {
                Text("0:00")
            } else {
                Text(timerInterval: context.state.startedAt...context.state.endsAt, countsDown: true)
            }
        }
        .monospacedDigit()
    }
}
