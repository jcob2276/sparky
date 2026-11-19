import SwiftUI
import WidgetKit

@available(iOS 18.0, *)
@MainActor
private func captureControl(
    _ action: SparkyCaptureAction,
    title: LocalizedStringResource,
    symbol: String
) -> some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: "app.vanguard.os.control.\(action.rawValue)") {
        ControlWidgetButton(action: SparkyCaptureIntent(target: action)) {
            Label(title, systemImage: symbol)
        }
    }
    .displayName(title)
}

@available(iOS 18.0, *)
struct SparkyNoteControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        captureControl(.note, title: "Nowa notatka", symbol: "square.and.pencil")
    }
}

@available(iOS 18.0, *)
struct SparkyTaskControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        captureControl(.task, title: "Nowe zadanie", symbol: "checklist")
    }
}

@available(iOS 18.0, *)
struct SparkyCameraControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        captureControl(.camera, title: "Zrób zdjęcie posiłku", symbol: "camera")
    }
}

@available(iOS 18.0, *)
struct SparkyBarcodeControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        captureControl(.barcode, title: "Skanuj kod", symbol: "barcode.viewfinder")
    }
}
