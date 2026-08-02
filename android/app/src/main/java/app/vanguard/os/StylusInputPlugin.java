package app.vanguard.os;

import android.view.MotionEvent;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StylusInput")
public class StylusInputPlugin extends Plugin {
    private boolean active = false;
    private boolean stylusGestureActive = false;

    @PluginMethod
    public void start(PluginCall call) {
        active = true;
        JSObject result = new JSObject();
        result.put("density", getContext().getResources().getDisplayMetrics().density);
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        active = false;
        stylusGestureActive = false;
        call.resolve();
    }

    public boolean handleMotionEvent(MotionEvent event) {
        if (!active || event.getPointerCount() == 0) return false;
        int actionIndex = event.getActionIndex();
        int toolType = event.getToolType(actionIndex);
        boolean isStylus = toolType == MotionEvent.TOOL_TYPE_STYLUS
            || toolType == MotionEvent.TOOL_TYPE_ERASER;

        if (!isStylus) return stylusGestureActive;
        int action = event.getActionMasked();
        if (action == MotionEvent.ACTION_DOWN || action == MotionEvent.ACTION_POINTER_DOWN) {
            stylusGestureActive = true;
        }

        JSObject payload = new JSObject();
        payload.put("action", actionName(action));
        payload.put("eraser", toolType == MotionEvent.TOOL_TYPE_ERASER
            || (event.getButtonState() & MotionEvent.BUTTON_STYLUS_PRIMARY) != 0);
        payload.put("buttonState", event.getButtonState());
        JSArray points = new JSArray();
        for (int history = 0; history < event.getHistorySize(); history++) {
            points.put(point(event, actionIndex, history));
        }
        points.put(point(event, actionIndex, -1));
        payload.put("points", points);
        notifyListeners("stylusEvent", payload, true);

        if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL
            || action == MotionEvent.ACTION_POINTER_UP) {
            stylusGestureActive = false;
        }
        return true;
    }

    private JSObject point(MotionEvent event, int pointerIndex, int historyIndex) {
        JSObject point = new JSObject();
        boolean current = historyIndex < 0;
        point.put("x", current ? event.getX(pointerIndex) : event.getHistoricalX(pointerIndex, historyIndex));
        point.put("y", current ? event.getY(pointerIndex) : event.getHistoricalY(pointerIndex, historyIndex));
        point.put("pressure", current ? event.getPressure(pointerIndex) : event.getHistoricalPressure(pointerIndex, historyIndex));
        point.put("tilt", current ? event.getAxisValue(MotionEvent.AXIS_TILT, pointerIndex)
            : event.getHistoricalAxisValue(MotionEvent.AXIS_TILT, pointerIndex, historyIndex));
        point.put("orientation", current ? event.getOrientation(pointerIndex)
            : event.getHistoricalOrientation(pointerIndex, historyIndex));
        point.put("time", current ? event.getEventTime() : event.getHistoricalEventTime(historyIndex));
        return point;
    }

    private String actionName(int action) {
        switch (action) {
            case MotionEvent.ACTION_DOWN:
            case MotionEvent.ACTION_POINTER_DOWN: return "down";
            case MotionEvent.ACTION_MOVE: return "move";
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_POINTER_UP: return "up";
            default: return "cancel";
        }
    }
}
