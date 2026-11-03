# Evidencia local de Etapa 2A

Base `d765429b798e342460dbbdc55b4db03e172531f2`, trabajo aislado en `feature/android-release-google-play`, 3 de noviembre de 2026. El checkout original de #83 se conserva limpio. Los resultados siguientes se obtuvieron en el estado de trabajo previo a los commits; los paquetes finales se identifican en el Draft PR y artifacts CI mediante SHA/estado/hashes propios.

| Comando / comprobación | Resultado local |
|---|---|
| `npm ci --prefer-offline` | Correcto, sin cambiar dependencias |
| `npm run lint` | PASS |
| `npm run test:coverage -- --runner-config=test/vitest.serial.config.mjs` | 598 PASS, 66 archivos, 0 fallos |
| `npm run test:regression -- --runner-config=test/vitest.serial.config.mjs` | 154 PASS, 29 archivos, selección solapada con general |
| Pruebas de entorno seleccionadas | 11 PASS, incluidas en las 598 |
| `npm run test:build-config` | 5 PASS de herramientas de compilación, fuera de Angular |
| `npm run build -- --configuration=development` | PASS |
| `npm run android:debug` | Angular Development + sync + assembleDebug PASS |
| `npm run android:demo` | Angular DEMO + sync + assembleDebug PASS |
| Device Debug con loopback explícito | Build PASS; no instalado |
| `npm run android:release` | Angular Production + sync + assembleRelease/bundleRelease + R8 PASS |
| `npm run android:verify-release` | Manifiesto, XML, permisos, entorno, assets y mapping PASS |
| Gradle `:app:verifyReleaseWebAssets` con assets Device Debug | Rechazo esperado, exit 1: exige production/staging Release |
| `npm audit --omit=dev` | 0 vulnerabilidades runtime |
| `git diff --check` | PASS |

Cobertura de aplicación: líneas **97.89 %**, instrucciones 95.83 %, funciones 94.07 %, ramas 93.86 %. No se alteraron umbrales. La configuración de cobertura existente se concentra en `src/app`; los 11 casos de entorno se cuentan como pruebas, sin atribuirles aumento de cobertura de aplicación.

La instalación completa reportó 29 alertas de dependencias de desarrollo/transitivas (1 baja, 24 moderadas, 2 altas, 2 críticas); se conserva la política del workflow que hace informativo el audit completo y exige el de runtime. No se aplicaron actualizaciones masivas fuera de alcance.

Advertencias: nueve selectores CSS omitidos por el optimizador Angular y avisos Gradle de `flatDir`/características obsoletas existentes. No se silenciaron ni redujeron budgets para pasar. R8 generó mapping sin reglas globales que deshabiliten optimización. APK/AAB no contienen bibliotecas `.so`.

No había emulador ni Galaxy A55 conectado (`adb devices -l` vacío) ni Maestro local equivalente. Maestro DEMO se comprueba en Actions; no demuestra operación real del backend. Release no se instaló porque no hay firma autorizada ni dispositivo disponible. El certificado TLS del catálogo público fue válido; no hubo escrituras comerciales ni E2E PostgreSQL.

No se certifican Play readiness, sesión persistente cifrada, pinning o eliminación de cuenta. Firma/custodia, prueba funcional Release, staging y privacidad permanecen pendientes explícitos.
