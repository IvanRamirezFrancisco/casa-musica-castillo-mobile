package com.casademusicacastillo.app;

import com.getcapacitor.BridgeActivity;
import android.content.pm.ApplicationInfo;
import android.security.NetworkSecurityPolicy;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        boolean debug = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        // Manifest controls debugging, even if an asset configuration were to request it.
        WebView.setWebContentsDebuggingEnabled(debug);
        // Only the local Debug overlay permits loopback. Connected Debug variants remain HTTPS-only.
        if (debug && NetworkSecurityPolicy.getInstance().isCleartextTrafficPermitted("127.0.0.1")) {
            getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        } else {
            getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
    }
}
