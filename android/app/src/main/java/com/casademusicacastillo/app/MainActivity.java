package com.casademusicacastillo.app;

import com.getcapacitor.BridgeActivity;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.WebSettings;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Solo debug: HTTPS localhost -> HTTP del host del emulador.
        // network_security_config limita cleartext a 10.0.2.2 en ese build.
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
    }
}
