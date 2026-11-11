# Firma local de Android Release con PKCS12

La clave de carga permanece fuera del repositorio. Play App Signing conserva la identidad de distribución administrada por Google. Si la aplicación ya existe en Play, compara la huella pública con el **certificado de clave de carga** de la aplicación, además de cotejar el último versionCode utilizado. [Referencia oficial](https://developer.android.com/studio/publish/app-signing)

## Windows PowerShell

Abre una terminal local sin transcripción y ejecuta desde el worktree de la rama integral. Se requieren Node.js, Python, JDK 21, Android SDK y las dependencias ya instaladas en el repositorio.

```powershell
Set-Location -LiteralPath 'C:\Users\ivanf\Documents\Desarrollo Movil Integral\casa-musica-mobile\reports\movil-integral'
.\scripts\sign-android-release.ps1 -KeystorePath 'C:\Users\ivanf\CMC-Keys\castillo-upload.p12' -KeyAlias 'castillo-upload' -CertificateSha256 '47:49:2A:A3:5B:3F:B2:61:73:BA:F1:EF:23:6C:3C:2B:EF:C3:3D:B8:E3:ED:C3:D5:2E:F0:C7:75:35:33:DB:C3'
```

Introduce la contraseña cuando aparezca el prompt enmascarado. Este flujo usa la misma contraseña para el almacén y la entrada privada PKCS12. El script comprueba el alias y la huella antes de compilar. Usa las cuatro variables `CMC_UPLOAD_*` en el proceso de firma y las elimina incluso si falla. Angular y Capacitor Sync se ejecutan sin esas variables. Gradle usa `--no-daemon` y desactiva la caché de configuración para esta compilación. La contraseña se convierte temporalmente a texto en memoria para que Java y Gradle puedan leerla.

El comando genera y verifica ambos paquetes. Las rutas de salida dentro del worktree son:

| Archivo | Resultado |
|---|---|
| `reports/android-packages/production-release-signed/app-release.apk` | APK Release firmado, verificado con apksigner |
| `reports/android-packages/production-release-signed/app-release.aab` | AAB Release firmado, verificado con jarsigner y keytool |
| `reports/android-packages/production-release-signed/build-report.json` | SHA Git, estado del árbol, entorno y SHA-256 de los paquetes |
| `reports/android-packages/production-release-signed/verification.json` | Huellas de ambos firmantes, hashes, metadatos y comprobaciones estáticas |

El éxito requiere que la ejecución termine con estado PASS. Si falla, los archivos que existan en la carpeta pueden ser de una ejecución anterior o estar pendientes de verificación. Para repetir la comprobación después de un build exitoso, sin volver a introducir la contraseña:

```powershell
python scripts/verify-android-release.py --certificate-sha256 '47:49:2A:A3:5B:3F:B2:61:73:BA:F1:EF:23:6C:3C:2B:EF:C3:3D:B8:E3:ED:C3:D5:2E:F0:C7:75:35:33:DB:C3'
Get-FileHash -Algorithm SHA256 -LiteralPath @(
  'reports/android-packages/production-release-signed/app-release.apk'
  'reports/android-packages/production-release-signed/app-release.aab'
)
```

Gradle valida los metadatos del manifiesto dentro del AAB y aapt2 verifica los del APK. La configuración actual conserva `com.casademusicacastillo.app`, versión 1.0, versionCode 1 y target SDK 36. Los paquetes técnicos sin firma se conservan en `production-release`.

La APK firmada con la clave de carga solo puede actualizar una instalación con certificado compatible. Para una instalación entregada por Google Play, coteja el certificado de distribución antes de intentar la actualización. [Play App Signing](https://developer.android.com/studio/publish/app-signing)

La verificación de firma y contenido acredita el paquete técnico. La aceptación de login y carrito en Production, la aceptación física y los requisitos de privacidad siguen siendo hitos separados. Este flujo termina en archivos locales.
