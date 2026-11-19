import AppIntents
import Foundation

#if !SPARKY_WIDGET_EXTENSION
import Capacitor
import UIKit
#endif

@available(iOS 18.0, *)
enum SparkyCaptureAction: String, AppEnum {
    case note = "new-note"
    case task = "new-task"
    case camera
    case barcode

    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Akcja Sparky"
    static let caseDisplayRepresentations: [Self: DisplayRepresentation] = [
        .note: "Nowa notatka",
        .task: "Nowe zadanie",
        .camera: "Zrób zdjęcie posiłku",
        .barcode: "Skanuj kod"
    ]
}

@available(iOS 18.0, *)
struct SparkyCaptureIntent: OpenIntent {
    static let title: LocalizedStringResource = "Otwórz akcję Sparky"
    static let openAppWhenRun = true

    @Parameter(title: "Akcja")
    var target: SparkyCaptureAction

    init() {}

    init(target: SparkyCaptureAction) {
        self.target = target
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        #if !SPARKY_WIDGET_EXTENSION
        if let url = URL(string: "sparky-widget://open/\(target.rawValue)") {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
        }
        #endif
        return .result()
    }
}

#if !SPARKY_WIDGET_EXTENSION
@available(iOS 18.0, *)
struct SparkyAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: SparkyCaptureIntent(target: .note),
            phrases: ["Nowa notatka w \(.applicationName)"],
            shortTitle: "Nowa notatka",
            systemImageName: "square.and.pencil"
        )
        AppShortcut(
            intent: SparkyCaptureIntent(target: .camera),
            phrases: ["Zrób zdjęcie posiłku w \(.applicationName)"],
            shortTitle: "Zdjęcie posiłku",
            systemImageName: "camera"
        )
        AppShortcut(
            intent: SparkyCaptureIntent(target: .barcode),
            phrases: ["Skanuj kod w \(.applicationName)"],
            shortTitle: "Skanuj kod",
            systemImageName: "barcode.viewfinder"
        )
        AppShortcut(
            intent: SparkyCaptureIntent(target: .task),
            phrases: ["Nowe zadanie w \(.applicationName)"],
            shortTitle: "Nowe zadanie",
            systemImageName: "checklist"
        )
    }
}
#endif
