# Firma Android privada — procedimiento preparado, no ejecutado

Etapa 2B, 3 de noviembre. No se crea/importa upload key, no se firma ni se sube paquete. Reutiliza scripts/Gradle de 2A. Antes de operar: confirmar titularidad/representación/custodio del negocio y autorización expresa para generar o usar la identidad definitiva. No enviar passwords al chat.

## Custodia y elección

Si existe upload key autorizada, reutilizar su keystore/alias/certificado, sin generar otra ni convertirla automáticamente. Play App Signing administra la firma de distribución; la upload key identifica la carga. Reemplazo/recuperación se tramita con Google; no cambiar applicationId ni usar debug key. [Referencia oficial](https://developer.android.com/studio/publish/app-signing).

Acordar ruta privada absoluta fuera de ambos repositorios/artifacts y carpetas compartidas, custodio/acceso mínimo, respaldo cifrado offline y segunda copia controlada. Contraseñas en gestor privado, separadas del archivo. Terminal dedicada sin transcripciones/volcados de entorno. Datos de identidad del certificado deben ser factuales y autorizados, no inventados aquí.

## Creación o reutilización manual tras autorización

```powershell
$cmcKeyPath = Read-Host 'Ruta absoluta privada fuera de Git'
$cmcKeyAlias = Read-Host 'Alias autorizado'
# Solo si se autorizó CREAR y se verificó que la ruta no existe:
keytool -genkeypair -keystore $cmcKeyPath -storetype PKCS12 -alias $cmcKeyAlias -keyalg RSA -keysize 2048 -validity 10000
# Para una identidad existente, omitir genkeypair y comprobar el archivo autorizado:
keytool -list -v -keystore $cmcKeyPath -alias $cmcKeyAlias
```

keytool solicita passwords privadamente; no añadir `-storepass`/`-keypass` en comandos compartidos. PKCS12 normalmente usa el mismo password de almacén/clave; verificar tipo/condiciones de la identidad elegida. Registrar solo certificado SHA-256, alias, tipo, fecha/custodio por canal autorizado. La huella de certificado no es el hash del paquete. Un certificado público exportado debe ir fuera de Git; nunca compartir clave privada.

## Variables solo de proceso y build autorizado

```powershell
$env:CMC_UPLOAD_STORE_FILE = $cmcKeyPath
$env:CMC_UPLOAD_KEY_ALIAS = $cmcKeyAlias
$cmcStoreSecret = Read-Host 'Password almacén (privado)' -AsSecureString
$cmcKeySecret = Read-Host 'Password clave (privado)' -AsSecureString
try {
  $env:CMC_UPLOAD_STORE_PASSWORD = [Net.NetworkCredential]::new('', $cmcStoreSecret).Password
  $env:CMC_UPLOAD_KEY_PASSWORD = [Net.NetworkCredential]::new('', $cmcKeySecret).Password
  node scripts/build-android.mjs --environment production --variant release --require-signing
  if ($LASTEXITCODE -ne 0) { throw 'Build no completado' }
  npm run android:verify-release
  if ($LASTEXITCODE -ne 0) { throw 'Verificación técnica falló' }
} finally {
  Remove-Item Env:CMC_UPLOAD_STORE_FILE,Env:CMC_UPLOAD_KEY_ALIAS,Env:CMC_UPLOAD_STORE_PASSWORD,Env:CMC_UPLOAD_KEY_PASSWORD -ErrorAction SilentlyContinue
  $cmcStoreSecret.Dispose()
  $cmcKeySecret.Dispose()
}
```

La conversión a variables de proceso permite que Gradle lea passwords; no es cifrado en memoria. No imprimirlas, persistirlas globalmente ni activar `--debug`. Cerrar terminal/procesos después. Una configuración parcial falla y nunca se usa debug key para Release. No se configuran secretos remotos en esta fase.

## Verificación obligatoria de identidad e integridad

El verificador 2A de entorno/manifest/R8/firma APK no sustituye la verificación criptográfica del AAB y su identidad:

```powershell
$cmcTools = Join-Path $env:ANDROID_HOME 'build-tools/36.0.0'
& (Join-Path $cmcTools 'apksigner.bat') verify --verbose --print-certs reports/android-packages/production-release/app-release.apk
jarsigner -J-Duser.language=en -J-Duser.country=US -verify -verbose -certs reports/android-packages/production-release/app-release.aab
keytool -printcert -jarfile reports/android-packages/production-release/app-release.aab
Get-FileHash reports/android-packages/production-release/app-release.apk,reports/android-packages/production-release/app-release.aab -Algorithm SHA256
```

Exigir firma válida APK, `jar verified` y firmante presente AAB; no aceptar solo exit 0 (un JAR sin firma puede no fallar). Comparar ambas huellas con el certificado autorizado de keytool. Clasificar warnings de certificado autofirmado/cadena sin confundir confianza CA e integridad ni ignorar firmas inválidas. Registrar SHA del commit limpio, entorno, herramientas, huellas y hashes, sin valores privados.

Instalar APK firmado en A55 solo con autorización y ejecutar matriz funcional Release/puente/plugins. Firma incompatible al actualizar no autoriza desinstalar/borrar datos. AAB no se instala directamente; distribución/pruebas mediante paquetes derivados o Play necesitan su proceso autorizado. No probar con pagos, compras o eliminación de cuentas comerciales.

No afirmar Play readiness por build/R8/firma: aún requiere aceptación de dispositivo, política/contacto/procedimiento de eliminación, Data Safety y Console reales.
