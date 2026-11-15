# Android Release APK y AAB hacia Railway — Casa de Música Castillo

> Fecha de compilación: `2026-11-15`  
> Rama móvil: `feature/mobile-account-security` (PR #100)  
> Commit fuente limpio compilado (`sourceSha`): `8e0778fc19d428ed8397cd2fa7eed24630e2ae2d`  
> Origen API embebido: `https://casa-musica-castillo-backend-production.up.railway.app`

---

## 1. Metadatos de Empaquetado Verificados (`verification.json` / `build-report.json`)

| Propiedad | Valor verificado |
|---|---|
| **`applicationId`** | `com.casademusicacastillo.app` |
| **`versionCode`** | `2` |
| **`versionName`** | `1.1` |
| **`targetSdk`** | `36` (Android 16, requerido por Google Play) |
| **`environment`** | `production` |
| **`variant`** | `release` |
| **`sourceTreeDirty`** | `false` |
| **`debuggable`** | `false` |
| **`allowBackup`** | `false` |
| **`releaseCleartext`** | `false` (`network_security_config.xml` bloquea tráfico HTTP en claro) |
| **`sourceMaps`** | `false` |
| **`fixtureAndDiagnosticMarkersAbsent`** | `true` |
| **`r8BridgeMethodPreserved`** | `true` |
| **`r8SecureStorageMethodsPreserved`** | `true` |
| **`r8MappingSha256`** | `f6c1f2b7accee72ed23c33b8902c7f4a5366f8caec46a6abf66a20792f084110` |
| **`reviewedCommerce`** | `false` (compilación técnica estándar; ver sección 3) |
| **Referencias `onrender.com` en assets** | `0` (`ASSETS_ONRENDER_COUNT=0`, `ASSETS_RAILWAY_COUNT=2`) |

Permisos declarados en el manifiesto compilado:
- `android.permission.INTERNET`
- `android.permission.VIBRATE`
- `com.casademusicacastillo.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`

---

## 2. Artefactos Generados (Técnicos Sin Firmar — Listos para Firma Upload Key)

Compilados mediante `npm run android:release` y validados con `npm run android:verify-release` (`status: "PASS"`):

| Artefacto | Ruta relativa | Tamaño (bytes) | Entradas ZIP | SHA-256 |
|---|---|---|---|---|
| **Release APK (sin firmar)** | `reports/android-packages/production-release/app-release-unsigned.apk` | `2,895,197` | `565` | `983de0bcd792b63922df3edae11fb6b72bc89a36ae35eb8fc91419915cfd783e` |
| **Release AAB (sin firmar)** | `reports/android-packages/production-release/app-release.aab` | `3,367,911` | `571` | `798f429e91e68d314275d10b74db8b41bf76d14fdae29aff2c63a37ff36b4358` |

---

## 3. Firma con Keystore de Subida Existente (`castillo-upload.p12`)

### 3.1 Llave de subida existente localizada (NO regenerada)
Se verificó la existencia de la llave de subida oficial en la estación local:
- Keystore: `C:\Users\ivanf\CMC-Keys\castillo-upload.p12` (`4,394` bytes)
- Certificado PEM público: `C:\Users\ivanf\CMC-Keys\castillo-upload-cert.pem` (`1,930` bytes)
- Alias esperado: `castillo-upload`
- Huella SHA-256 registrada del certificado de subida:
  `47:49:2A:A3:5B:3F:B2:61:73:BA:F1:EF:23:6C:3C:2B:EF:C3:3D:B8:E3:ED:C3:D5:2E:F0:C7:75:35:33:DB:C3`

> **Bloqueo limpio de seguridad:** La contraseña privada de `castillo-upload.p12` no está presente en archivos del repositorio ni en variables `CMC_UPLOAD_*` del entorno, por lo que no se realizó firma automática ni se creó ninguna llave alterna. El script oficial solicita las credenciales de forma interactiva en memoria (`SecureString`) sin escribirlas en disco ni en logs.

### 3.2 Comando exacto para generar el APK y AAB firmados

En PowerShell dentro de la raíz del worktree móvil:

```powershell
# Firma Release con valores por defecto y operaciones revisadas de carrito/favoritos/cotización activadas
.\scripts\sign-android-release.ps1
```

Por defecto emplea `-KeystorePath 'C:\Users\ivanf\CMC-Keys\castillo-upload.p12'`, `-KeyAlias 'castillo-upload'`, `-CertificateSha256 '47:49:2A:A3:5B:3F:B2:61:73:BA:F1:EF:23:6C:3C:2B:EF:C3:3D:B8:E3:ED:C3:D5:2E:F0:C7:75:35:33:DB:C3'` y `--enable-reviewed-commerce` activado. Si necesitas compilar un Release firmado con las mutaciones revisadas desactivadas, pasa `-DisableReviewedCommerce`:

```powershell
.\scripts\sign-android-release.ps1 -DisableReviewedCommerce
```

Variables opcionales de entorno aceptadas por `scripts/build-android.mjs` (en sesión efímera, nunca en archivos):
- `CMC_UPLOAD_KEYSTORE_PATH` (default: `C:\Users\ivanf\CMC-Keys\castillo-upload.p12`)
- `CMC_UPLOAD_KEY_ALIAS` (default: `castillo-upload`)
- `CMC_UPLOAD_CERT_SHA256` (`47:49:2A:A3:5B:3F:B2:61:73:BA:F1:EF:23:6C:3C:2B:EF:C3:3D:B8:E3:ED:C3:D5:2E:F0:C7:75:35:33:DB:C3`)
- `CMC_UPLOAD_STORE_PASSWORD` / `CMC_UPLOAD_KEY_PASSWORD` (o captura segura vía prompt interactivo en `sign-android-release.ps1`).

Salida esperada del script firmado:
- `reports/android-packages/production-release-signed/app-release.apk`
- `reports/android-packages/production-release-signed/app-release.aab`
- Verificación posterior obligatoria (`status: "PASS"`, `signing: "signed"`):
  `npm run android:verify-release -- --output-dir reports/android-packages/production-release-signed`

---

## 4. Guardas de Escritura Comercial en Release

1. **`productionCommerceInterceptor` (`src/app/core/security/production-commerce.interceptor.ts`):**
   - Por defecto en `release`, bloquea escrituras (`POST`/`PUT`/`DELETE` salvo rutas permitidas de auth) hacia `PRODUCTION_API_BASE_URL` devolviendo HTTP `403` local (`"La operación comercial todavía no está habilitada."`).
   - Al compilar con `--enable-reviewed-commerce` (`CMC_REVIEWED_COMMERCE`, activo por defecto en `sign-android-release.ps1`), permite únicamente operaciones revisadas de carrito (`POST /api/cart/items`, `PUT /api/cart/items/{id}`, `DELETE /api/cart/items/{id}`, `DELETE /api/cart`), favoritos (`POST /api/wishlist`, `DELETE /api/wishlist/{id}`) y cálculo de vista previa (`POST /api/checkout/price-preview`). Las rutas de creación de pedidos (`POST /api/checkout`), pagos (`POST /api/payments`), Mercado Pago, transferencias y reseñas permanecen bloqueadas con HTTP `403`.
2. **`REAL_CHECKOUT_WRITE_ENABLED` (`src/app/core/repositories/checkout.repository.ts`):**
   - Permanece en `false` por defecto para evitar envíos reales accidentales de `POST /api/checkout` contra producción desde pruebas sin autorización explícita.
