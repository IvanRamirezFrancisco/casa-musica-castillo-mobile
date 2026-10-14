# HERRAMIENTAS DE PRUEBA

Selección verificada el 12/10/2026. Se mantienen las herramientas instaladas; no se migra framework ni se instala Newman. Los títulos de actividades irán EN MAYÚSCULAS y con fuente azul #1F4E79 en Word/PDF.

| TIPO | HERRAMIENTA / SOFTWARE | FINALIDAD Y JUSTIFICACIÓN | EVIDENCIA | RESPONSABLE | MOMENTO / DÓNDE SE EJECUTA |
|---|---|---|---|---|---|
| PRUEBAS UNITARIAS | Vitest 4.0.18 + Angular TestBed, jsdom; Node 22 CI | Lógica/validadores/estado Angular; conservar builder `@angular/build:unit-test` 22.2.1 | JUnit + text/HTML/lcov/json-summary con `@vitest/coverage-v8` 4.0.18 | Tackalay; revisión Ivan | Local y GitHub Actions; cada PR/push; XP1–5 |
| ANÁLISIS DE CÓDIGO ESTÁTICO | ESLint 10, angular-eslint 22, TypeScript 6 / compilador Angular 22.2.1 | Reglas TS/HTML y tipos/plantillas/budgets, sin duplicar herramientas | Log lint/build y estado CI | IvanRamirezFrancisco | Local y GitHub Actions; cada PR/push; XP1–5 |
| PRUEBAS DE INTEGRACIÓN | Vitest/TestBed; Postman CLI 1.73.0 | Interacción real entre componentes/servicios; contrato HTTP externo versionable local sin API key Postman | JUnit frontend y API, evidencia de ambiente/fixture | Tackalay frontend; Ivan API | GitHub Actions/local; PR frontend; API manual al cambiar contrato/cierre XP |
| PRUEBAS DE ACEPTACIÓN | Maestro CLI 2.11.0, Java 21, Android Emulator API 34 x86_64, Capacitor 8.5.2 | Interacción de usuario en APK, CLI local sin Maestro Cloud; limita alcance a UI demo actual | JUnit, capturas, logs sanitizados y APK del mismo SHA | Tackalay; Ivan infraestructura | Cada Android Build y cierre XP |
| PRUEBAS DE REGRESIÓN | Reutilización Vitest/TestBed y Maestro | Detectar regresión de recorridos críticos sin copiar suites | JUnit critical-regression + aceptación | Tackalay | Cada corrección; cierre XP; manual antes entrega |
| PRUEBAS DE RENDIMIENTO | k6 OSS 2.3.0 | Carga moderada reproducible, percentiles, errores y thresholds versionados | Resumen/serie JSON, logs, SHA, ambiente | Ivan ejecución; Tackalay análisis | XP2 baseline; XP4/5 comparación, manual |
| PRUEBAS DE ESFUERZO / ESTRÉS | k6 OSS 2.3.0 | Carga progresiva acotada y observación de recuperación; no requiere servicio de pago | Series por fase, p95/error, diagnóstico de aborto/recuperación | Ivan ejecución; Tackalay análisis | Diseño XP2, ejecución XP4/5 con permiso, manual |
| PRUEBAS DE SEGURIDAD (complementarias) | npm audit y CodeQL JavaScript/TypeScript | Dependencias producción y análisis de código; conservar workflow exitoso | Logs audit, alertas CodeQL; PS requiere evidencia separada | Ivan pipeline, Tackalay casos PS | Cada PR/push y XP3–5 |

GitHub Actions orquesta todos los jobs. Los servicios externos no sustituyen el resultado local. No se habilita ningún plan de pago; las ejecuciones están sujetas a la cuota disponible de GitHub del repositorio.

## Compatibilidad y fuentes oficiales

- [Angular cobertura](https://angular.dev/guide/testing/code-coverage): V8 y opciones del builder. Se contrastó con `node_modules/@angular/build/src/builders/unit-test/schema.json` instalado, evitando opciones heredadas de Karma.
- [Angular TestBed](https://angular.dev/guide/testing/services): pruebas de servicios reales; no añadir HttpTestingController hasta existir consumidor HTTP.
- [Instalación Postman CLI](https://learning.postman.com/docs/postman-cli/postman-cli-installation/) y [collection run](https://learning.postman.com/docs/postman-cli/postman-cli-collections/): ejecución por ruta local y JUnit para v2.1; sin login/cloud.
- [Maestro CLI](https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options) y [QuickStart Android](https://docs.maestro.dev/get-started/quickstart.md): API 34 explícitamente soportada. [Release 2.11.0](https://github.com/mobile-dev-inc/Maestro/releases/tag/cli-2.11.0).
- [Android emulator runner](https://github.com/ReactiveCircus/android-emulator-runner): Linux KVM, AOSP `default` API 34/x86_64 y espera de arranque. Imagen confirmada en el [repositorio oficial SDK](https://dl.google.com/android/repository/sys-img/android/sys-img2-4.xml). El logcat del run 38400022024 mostró que la imagen Google APIs cerró la app al morir GMS FontsProvider; AOSP elimina esa dependencia ajena a los flujos demo. Se mantiene SDK de compilación 36 y minSdk 24 del proyecto. No se validan funciones de Google Play Services con esta imagen.
- [k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/) y [ramping-vus](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/): límites, percentiles y aborto temprano. [Release 2.3.0](https://github.com/grafana/k6/releases/tag/v2.3.0).
- [actionlint](https://github.com/rhysd/actionlint): validación sintáctica/semántica de GitHub Actions; versión local 1.7.12. Complementa, no reemplaza, ejecución real en GitHub.

Versiones de acciones que ya funcionaban se mantienen. Nuevas dependencias npm del proyecto: únicamente proveedor de cobertura, fijado a la versión de Vitest. Postman/k6/Maestro se instalan solo en su job; no aumentan el bundle móvil.
