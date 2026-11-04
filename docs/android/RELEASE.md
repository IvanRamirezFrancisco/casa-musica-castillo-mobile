# Android Release verificable

Base aprobada: PR #83, `d765429b798e342460dbbdc55b4db03e172531f2`. La rama `feature/android-release-google-play` depende de `feature/actividad-4-integracion-movil` mientras #83 siga abierto. No cambia `main`, `develop`, el backend ni los PR #71/#77/#80.

## Compilación

Requisitos: Node 22 compatible con el proyecto, `npm ci`, JDK 21, Android SDK/platform 36, build-tools y variables `ANDROID_HOME`/`JAVA_HOME` apropiadas. Se usa el wrapper Gradle existente.

| Comando desde la raíz | Resultado en `reports/android-packages/` |
|---|---|
| `npm run android:debug` | `development-debug/app-debug.apk`, backend local/emulador |
| `npm run android:demo` | `demo-debug/app-debug.apk`, fixtures para Maestro |
| `npm run android:release` | `production-release/app-release-unsigned.apk` y `app-release.aab` sin firma de distribución |
| `npm run android:verify-release` | Inspección estática y `verification.json` del Release conservado |
| `npm run test:build-config` | Pruebas de selección y rechazo de combinaciones inseguras |

El proceso selecciona Angular, compila, sincroniza Capacitor y ejecuta Gradle. Debug Gradle y Development Angular son decisiones diferentes. Los destinos separan DEMO, desarrollo, teléfono y Release. No se versionan paquetes, recursos generados, mapas ni claves.

`build-report.json` registra entorno, origen API, SHA Git, árbol modificado, variante, categoría de firma y SHA-256/tamaño. `cmc-build.json` vincula el inventario SHA-256 de assets con la selección. Gradle verifica el árbol completo tras sync y bloquea Release con assets equivocados/alterados. La evidencia final debe indicar el commit y `sourceTreeDirty:false`; un build previo solo demuestra el estado de trabajo registrado.

## Optimización y seguridad

Se conservan applicationId `com.casademusicacastillo.app`, min SDK 24, compile/target 36, versionCode 1 y versionName 1.0. Release activa R8, minificación, reducción de recursos y reglas optimizadas del SDK. Capacitor aporta consumer rules para plugins/anotaciones; la regla propia conserva únicamente métodos `JavascriptInterface`. No hay keep global ni desactivación de optimización.

El verificador comprueba mapping R8, método puente `MessageHandler.postMessage`, manifiesto compilado, XML empaquetado, permisos, origen API y hashes. Rechaza source maps JavaScript; el AAB conserva el mapa R8 estándar para retrace. Conservar ese mapa como evidencia de soporte.

R8 transforma bytecode Java/Kotlin; no cifra Angular ni protege por sí solo los datos del WebView. HTTPS no acredita certificate pinning. Esta fase no implementa pinning ni TT-05. Se requiere aceptación funcional del Release firmado, puente y plugins antes de distribuirlo. [Optimización Android](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization).

Release desactiva depuración nativa/WebView y mixed content. `loggingBehavior: debug` limita logs Capacitor al estado debuggable; no garantiza que cualquier futura telemetría o console propia sea inocua. No registrar tokens ni datos personales.

Backup se deshabilita y se excluyen archivos, bases y preferencias en backup antiguo, nube y transferencia moderna. Algunos fabricantes pueden tratar distinto la transferencia con `allowBackup=false`; las exclusiones explícitas cubren también ese caso y deben probarse en dispositivos soportados. No sustituyen almacenamiento cifrado de sesión. [Backup Android](https://developer.android.com/identity/data/autobackup).

El manifiesto fusionado conserva INTERNET, VIBRATE del plugin Haptics existente y el receptor AndroidX con permiso de firma. No se agrega permiso peligroso. Las excepciones HTTP de loopback/emulador solo existen en Debug.

## Firma pendiente

Etapa 2B detalla el procedimiento privado de creación/importación, custodia y verificación APK/AAB en [UPLOAD_KEY_RUNBOOK.md](UPLOAD_KEY_RUNBOOK.md). Preparado, no ejecutado.

Sin las cuatro variables privadas siguientes solo se generan artefactos técnicos sin firma de distribución: `CMC_UPLOAD_STORE_FILE`, `CMC_UPLOAD_STORE_PASSWORD`, `CMC_UPLOAD_KEY_ALIAS`, `CMC_UPLOAD_KEY_PASSWORD`. Una configuración parcial falla; nunca se usa debug key para Release.

Una sesión futura autorizada debe acordar titular, alias, ubicación fuera de Git, custodia, respaldo y recuperación de la upload key. Entonces generar/importar manualmente y suministrar variables desde un gestor seguro o entrada privada. No escribir valores en comandos compartidos/logs/archivos versionados. Aquí no se genera clave ni se configuran secretos remotos.

Con identidad autorizada disponible:

```powershell
node scripts/build-android.mjs --environment production --variant release --require-signing
npm run android:verify-release
```

El APK pasa a `app-release.apk`. Verificar además certificado/huella esperados con `apksigner verify --verbose --print-certs`, firma del AAB y correspondencia con upload key. Un APK sin firma no se instala; un AAB técnico no está listo para Play. [Firma Android](https://developer.android.com/studio/publish/app-signing).

## CI y trazabilidad

El nuevo workflow conserva evidencia durante 14 días. Quality Gate mantiene los seis controles y agrega `Verificar Android Release sin firma`: siete controles del HEAD del PR. Los filtros incluyen la base apilada. Se conserva la política de documentación únicamente; estos cambios requieren ejecución completa.

Resultados finales y hashes se registran en el Draft PR/artifacts del mismo SHA, evitando otro commit documental sin ejecución. HTTP controlado y Maestro DEMO no son E2E PostgreSQL. Release sin firma carece de aceptación en dispositivo.

Referencias sin cierre: TT-02 #16, TT-03 #17, TT-05 #19 (pendiente), TT-40 #59, TT-43 #62, TT-45 #64, TT-46 #65, TT-47 #66 y PV #54/#58. No cambiar responsables/Story Points/estados sin aceptación. Consultar [entornos](ENVIRONMENTS.md), [backend](BACKEND_DEPENDENCIES.md) y [privacidad/Play](PLAY_PRIVACY_READINESS.md).
