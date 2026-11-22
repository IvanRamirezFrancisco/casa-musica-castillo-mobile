package com.casademusicacastillo.app;

import android.app.Activity;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name = "GoogleCredential")
public class GoogleCredentialPlugin extends Plugin {

    @PluginMethod
    public void signIn(PluginCall call) {
        String serverClientId = call.getString("serverClientId");
        String nonce = call.getString("nonce");
        if (serverClientId == null || serverClientId.isBlank() || nonce == null || nonce.isBlank()) {
            call.reject("Configuración de Google incompleta.", "INVALID_ARGUMENTS");
            return;
        }

        Activity activity = getActivity();
        if (activity == null || activity.isFinishing()) {
            call.reject("La pantalla no está disponible para iniciar sesión.", "UNAVAILABLE");
            return;
        }

        GetSignInWithGoogleOption googleOption = new GetSignInWithGoogleOption.Builder(serverClientId.trim())
                .setNonce(nonce.trim())
                .build();

        GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(googleOption)
                .build();

        CredentialManager credentialManager = CredentialManager.create(activity);
        credentialManager.getCredentialAsync(
                activity,
                request,
                null,
                ContextCompat.getMainExecutor(activity),
                new CredentialManagerCallback<>() {
                    @Override
                    public void onResult(@NonNull GetCredentialResponse response) {
                        Credential credential = response.getCredential();
                        if (credential instanceof CustomCredential customCredential
                                && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(customCredential.getType())) {
                            try {
                                GoogleIdTokenCredential parsed = GoogleIdTokenCredential.createFrom(customCredential.getData());
                                String idToken = parsed.getIdToken();
                                if (idToken == null || idToken.isBlank()) {
                                    call.reject("Google no devolvió una credencial válida.", "EMPTY_TOKEN");
                                    return;
                                }
                                JSObject result = new JSObject();
                                result.put("cancelled", false);
                                result.put("idToken", idToken);
                                call.resolve(result);
                            } catch (Exception ex) {
                                call.reject("No se pudo interpretar la credencial de Google.", "PARSE_ERROR");
                            }
                            return;
                        }
                        call.reject("Tipo de credencial inesperado.", "UNSUPPORTED_CREDENTIAL");
                    }

                    @Override
                    public void onError(@NonNull GetCredentialException error) {
                        if (error instanceof GetCredentialCancellationException) {
                            JSObject cancelled = new JSObject();
                            cancelled.put("cancelled", true);
                            call.resolve(cancelled);
                            return;
                        }
                        if (error instanceof NoCredentialException) {
                            call.reject("No hay una cuenta de Google disponible en este dispositivo.", "NO_CREDENTIAL");
                            return;
                        }
                        call.reject("No se pudo completar el acceso con Google.", "CREDENTIAL_ERROR");
                    }
                });
    }

    @PluginMethod
    public void clearCredentialState(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }
        CredentialManager credentialManager = CredentialManager.create(activity);
        credentialManager.clearCredentialStateAsync(
                new ClearCredentialStateRequest(),
                null,
                ContextCompat.getMainExecutor(activity),
                new CredentialManagerCallback<>() {
                    @Override
                    public void onResult(Void result) {
                        call.resolve();
                    }

                    @Override
                    public void onError(@NonNull ClearCredentialException error) {
                        // Best-effort clearing on logout must never block local session cleanup.
                        call.resolve();
                    }
                });
    }
}
