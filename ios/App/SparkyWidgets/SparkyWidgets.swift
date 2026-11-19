import SwiftUI
import WidgetKit

private enum SparkyAction: String, CaseIterable, Identifiable {
    case keep, todo, camera, barcode

    var id: Self { self }

    var title: String {
        switch self {
        case .keep: "Notatki"
        case .todo: "Zadania"
        case .camera: "Aparat"
        case .barcode: "Skaner"
        }
    }

    var symbol: String {
        switch self {
        case .keep: "note.text"
        case .todo: "checklist"
        case .camera: "camera"
        case .barcode: "barcode.viewfinder"
        }
    }

    var url: URL {
        URL(string: "sparky-widget://open/\(rawValue)")!
    }
}

private struct ShortcutEntry: TimelineEntry {
    let date: Date
}

private struct ShortcutProvider: TimelineProvider {
    func placeholder(in context: Context) -> ShortcutEntry { ShortcutEntry(date: .now) }

    func getSnapshot(in context: Context, completion: @escaping (ShortcutEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ShortcutEntry>) -> Void) {
        completion(Timeline(entries: [placeholder(in: context)], policy: .never))
    }
}

private struct QuickActionsView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Sparky", systemImage: "bolt.fill")
                .font(.headline)
                .foregroundStyle(.primary)
                .widgetAccentable()
                .accessibilityAddTraits(.isHeader)

            HStack(spacing: 8) {
                ForEach(SparkyAction.allCases) { action in
                    Link(destination: action.url) {
                        VStack(spacing: 7) {
                            Image(systemName: action.symbol)
                                .font(.title3.weight(.semibold))
                                .widgetAccentable()
                                .accessibilityHidden(true)
                            Text(action.title)
                                .font(.caption.weight(.medium))
                                .lineLimit(1)
                                .minimumScaleFactor(0.75)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(.primary.opacity(0.07), in: RoundedRectangle(cornerRadius: 16))
                    }
                    .foregroundStyle(.primary)
                }
            }
        }
        .containerBackground(.background, for: .widget)
    }
}

private struct CameraShortcutView: View {
    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            Image(systemName: SparkyAction.camera.symbol)
                .font(.title3.weight(.semibold))
        }
        .accessibilityLabel("Sparky, aparat posiłku")
        .widgetURL(SparkyAction.camera.url)
        .containerBackground(.clear, for: .widget)
    }
}

private struct QuickActionsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SparkyQuickActions", provider: ShortcutProvider()) { _ in
            QuickActionsView()
        }
        .configurationDisplayName("Sparky · Szybkie akcje")
        .description("Otwórz notatki, zadania, aparat posiłku lub skaner kodów.")
        .supportedFamilies([.systemMedium])
    }
}

private struct CameraShortcutWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SparkyCameraShortcut", provider: ShortcutProvider()) { _ in
            CameraShortcutView()
        }
        .configurationDisplayName("Sparky · Aparat")
        .description("Zrób zdjęcie posiłku bez szukania aplikacji.")
        .supportedFamilies([.accessoryCircular])
    }
}

@main
struct SparkyWidgets: WidgetBundle {
    var body: some Widget {
        QuickActionsWidget()
        CameraShortcutWidget()
        WorkoutRestLiveActivity()
    }
}
