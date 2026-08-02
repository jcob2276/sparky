package app.vanguard.os;

import android.content.Intent;
import android.os.Bundle;
import android.view.MotionEvent;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private ShareIntentPlugin shareIntentPlugin;
    private StylusInputPlugin stylusInputPlugin;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UsageStatsPlugin.class);
        registerPlugin(BackgroundSyncPlugin.class);
        registerPlugin(ShareIntentPlugin.class);
        registerPlugin(WidgetBridgePlugin.class);
        registerPlugin(BleProbePlugin.class);
        registerPlugin(NightLightPlugin.class);
        registerPlugin(StylusInputPlugin.class);
        super.onCreate(savedInstanceState);

        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setWebChromeClient(new com.getcapacitor.BridgeWebChromeClient(this.bridge) {
                @Override
                public void onPermissionRequest(final android.webkit.PermissionRequest request) {
                    request.grant(request.getResources());
                }
            });
        }
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent event) {
        StylusInputPlugin plugin = getStylusInputPlugin();
        if (plugin != null && plugin.handleMotionEvent(event)) return true;
        return super.dispatchTouchEvent(event);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        ShareIntentPlugin plugin = getShareIntentPlugin();
        if (plugin != null) {
            plugin.handleNewIntent(intent);
        } else {
            ShareIntentPlugin.deferIntent(intent);
        }
    }

    private ShareIntentPlugin getShareIntentPlugin() {
        if (shareIntentPlugin == null && getBridge() != null) {
            shareIntentPlugin = (ShareIntentPlugin) getBridge().getPlugin("ShareIntent").getInstance();
        }
        return shareIntentPlugin;
    }

    private StylusInputPlugin getStylusInputPlugin() {
        if (stylusInputPlugin == null && getBridge() != null && getBridge().getPlugin("StylusInput") != null) {
            stylusInputPlugin = (StylusInputPlugin) getBridge().getPlugin("StylusInput").getInstance();
        }
        return stylusInputPlugin;
    }
}
