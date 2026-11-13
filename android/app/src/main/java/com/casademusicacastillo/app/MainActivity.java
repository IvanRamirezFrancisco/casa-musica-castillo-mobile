package com.casademusicacastillo.app;

import com.getcapacitor.BridgeActivity;
import android.content.pm.ApplicationInfo;
import android.security.NetworkSecurityPolicy;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        getBridge().getWebView().setBackgroundColor(getColor(R.color.ic_launcher_background));
        boolean debug = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        // Manifest controls debugging, even if an asset configuration were to request it.
        WebView.setWebContentsDebuggingEnabled(debug);
        // Only the local Debug overlay permits loopback. Connected Debug variants remain HTTPS-only.
        if (debug && NetworkSecurityPolicy.getInstance().isCleartextTrafficPermitted("10.0.2.2")) {
            getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        } else {
            getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
    }
}
