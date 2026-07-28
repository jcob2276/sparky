package app.vanguard.os;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private ShareIntentPlugin shareIntentPlugin;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UsageStatsPlugin.class);
        registerPlugin(BackgroundSyncPlugin.class);
        registerPlugin(ShareIntentPlugin.class);
        registerPlugin(WidgetBridgePlugin.class);
        registerPlugin(BleProbePlugin.class);
        registerPlugin(NightLightPlugin.class);
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
}
