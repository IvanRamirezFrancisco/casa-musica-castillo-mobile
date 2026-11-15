# Capacitor 8.5.2 publishes consumer rules for annotated plugins and their callbacks.
# Do not duplicate them with a blanket keep of com.getcapacitor.** or the application.
# The WebView invokes these methods by their JavaScript names (MessageHandler,
# CapacitorCookies and CapacitorHttp); preserve only annotated bridge members.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
