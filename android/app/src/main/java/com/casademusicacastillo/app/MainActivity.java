package com.casademusicacastillo.app;

import com.getcapacitor.BridgeActivity;
import android.content.pm.ApplicationInfo;
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
        // Cleartext exceptions exist only in the Debug resource overlay for local hosts.
        if (debug) {
            getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        } else {
            getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
    }
}
