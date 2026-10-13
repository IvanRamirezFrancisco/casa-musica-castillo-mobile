# PLAN DE PRUEBAS — CASA DE MÚSICA CASTILLO

Actualización: 12 de octubre de 2026. Alcance: app Ionic/Angular/Capacitor y contrato REST externo. TT-42, TT-44, TT-48 y TT-49.

## Estado real y límites

La base auditada es `develop` en `fc071671adea59d09776c0bc718a089ca3488327` (PR #72). Angular 22.2.1, TypeScript 6.0, Vitest 4.0.18, Ionic 9 y Capacitor 8.5.2. Existían 23 archivos de pruebas y 92 pruebas aprobadas. Los cuatro workflows de CI, seguridad, Android y staging habían pasado en ese commit.

La app usa `DemoCheckoutStateService` y `DemoAccountStateService`; el login navega después de validar el formulario, sin autenticar en servidor. Catálogo apunta a `DummyPage`; búsqueda, detalle y favoritos no tienen recorridos completos. No hay HttpClient ni contrato móvil implementado. Los pedidos demo no se alimentan de los pedidos creados en checkout. Ninguna prueba DEMO demuestra autorización, cobros, persistencia o cumplimiento total de una HU.

Se inspeccionó `IvanRamirezFrancisco/backend_` en `46bc32d8b0417370ab35e99866cabbeaaf830bba`, sin modificarlo. [API_CONTRACT.md](API_CONTRACT.md) identifica endpoints y brechas. No se ha autorizado una URL remota ni entregado una cuenta de pruebas: API, carga y estrés no se declaran ejecutados.

## Presentación académica

Los nombres de actividades de prueba se escribirán **EN MAYÚSCULAS**. En el documento académico final Word/PDF se aplicará además un **color de fuente diferente (azul #1F4E79)** a esas actividades, incluidos los títulos y las filas del calendario. Markdown conserva los títulos, pero no garantiza color; aplicar y verificar el estilo al exportar. El color no será el único medio de distinguirlas.

## PRUEBAS UNITARIAS

Verifican una unidad de lógica aislada: validadores, cálculos, estado y componentes. Vitest y Angular TestBed se conservan por compatibilidad con el builder instalado. Las pruebas existentes cubren formularios de HU-01–03, Inicio HU-04, carrito/checkout HU-09–11, pedidos HU-12–13 y perfil HU-14; se añaden pruebas de totales, cantidades, limpieza, snapshot y copia de perfil en servicios demo. HU-05–08 quedan planificadas hasta existir implementación.

Comando: `npm test -- --configuration=ci`. Evidencia: JUnit y cobertura en `reports/unit-tests.xml` y `coverage/app/`. Responsable: Tackalay; revisión técnica IvanRamirezFrancisco. Ejecutar en cada PR/push a develop/main y antes del commit.

## ANÁLISIS DE CÓDIGO ESTÁTICO

ESLint/angular-eslint detectan defectos TS/plantilla; `npm run build` verifica compilación TypeScript/Angular y presupuestos. Se aplica transversalmente a HU-01–14 conforme entra código, sin equivaler a su aceptación. CodeQL y npm audit complementan el análisis de seguridad, sin sustituir las pruebas PS.

Comandos: `npm run lint`, `npm run build`. Responsable: IvanRamirezFrancisco. Evidencia: jobs CI y Security, alertas CodeQL, resultados audit. Momento: PR y push a develop/main.

## PRUEBAS DE INTEGRACIÓN

Frontend: `critical.integration.spec.ts` utiliza componentes reales, plantillas, formularios y servicios compartidos de TestBed. Verifica propagación carrito→resumen, eliminación vía DOM, perfil válido e inválido. Solo Router.navigate se espía; no se simula una API inexistente. `npm run test:integration` genera JUnit.

API: Postman CLI oficial 1.73.0, colección local v2.1 sin vínculo cloud, secretos ni Newman. Contratos 200/400/401/403/404, token inválido y errores controlados. La ejecución manual requiere ambiente `testing` autorizado. Ver [API_CONTRACT.md](API_CONTRACT.md). Al implementar servicios HTTP móviles se añadirá `provideHttpClientTesting`/HttpTestingController compatible con Angular; actualmente no existe una integración HttpClient que probar.

Responsables: Tackalay (frontend), IvanRamirezFrancisco (contratos y ambiente). Momento: PR frontend; API antes de aceptar cada incremento y al cambiar contrato.

## PRUEBAS DE ACEPTACIÓN

Maestro CLI 2.11.0 local, emulador Android AOSP API 34 (`default`) x86_64, Java 21. API 34 cumple minSdk 24 y está documentada por Maestro; compilar con SDK 36 no exige emular API 36. Se reutiliza el APK del workflow Android, sin volver a compilarlo ni usar Maestro Cloud. Los tres flujos DEMO aprobaron en [run 38401961421](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/38401961421) sobre `3057af9`; el alcance backend permanece pendiente. AOSP evita el cierre de la app causado por GMS FontsProvider observado y documentado en VALIDATION_REPORT.

Flujos actuales:

| Flujo | HU | Verificación | Límite |
|---|---|---|---|
| `auth-demo.yaml` | 01,02,03,04 | Pantallas registro/recuperación y navegación por login demo | No crea cuenta ni recupera contraseña real |
| `purchase-demo.yaml` | 04,09,10,11 | Carrito precargado, selección entrega/pago y confirmación demo | No agrega desde catálogo, no verifica servidor ni cobra |
| `account-demo.yaml` | 12,13,14 | Pedidos demo, detalle y formulario de perfil | No aislamiento entre cuentas ni persistencia |

HU-05–08 no se incorporan artificialmente al flujo de compra. HU-11 y HU-12 no se presentan como integración real porque los datos son independientes. Completar esos flujos cuando existan endpoints/implementación. Los casos PF/PS de Issues siguen siendo el contrato de aceptación final.

Responsable: Tackalay; Ivan mantiene emulador/pipeline. Evidencia: JUnit, capturas y salida de Maestro del mismo SHA. Ejecución: después de cada build Android de PR/develop/main; en regresión manual; demostración al cierre de XP. Si el emulador no ejecuta, no sustituirlo por una captura simulada.

## PRUEBAS DE REGRESIÓN

Reutilizan las suites anteriores: `npm run test:regression` selecciona auth, inicio, carrito, checkout, pedidos, perfil y servicios; no copia pruebas. Prioridad: autenticación → catálogo/búsqueda (pendiente implementación) → carrito → checkout → pedidos → perfil. El workflow manual `regression.yml` ejecuta esta selección y llama al workflow Android, que incorpora aceptación Maestro. CI y Android ya ejecutan las suites en cada PR; no se agrega otra ejecución automática redundante de regresión.

Responsable: Tackalay. Evidencia: `critical-regression` y `acceptance-maestro-demo`. Momento: corrección de errores, final de cada XP y antes de entrega.

## PRUEBAS DE RENDIMIENTO

k6 OSS 2.3.0 contra `GET /api/public/products/catalog`, HU-05–06 y contenido de HU-04 cuando se integre. Perfil LOAD: 0→2 VUs en 15 s, hasta 5 VUs durante 60 s, descenso a 0 en 15 s; pausa de 1 s/iteración. Mide duración, solicitudes, errores, p90/p95 y checks. Umbrales iniciales de laboratorio: error <1 %, p90 <800 ms, p95 <1000 ms, checks >99 %. Son presupuestos propuestos, no SLA observado; revisar tras baseline autorizado sin ajustarlos solo para ocultar fallas.

Responsable: IvanRamirezFrancisco ejecuta; Tackalay analiza evidencia. Job PERFORMANCE/LOAD manual, ambiente testing. Evidencia: resumen JSON, serie temporal JSON, log/versiones, SHA, fecha, tamaño/datos del backend. No se mide rendimiento de PostgreSQL directamente desde la app: correlacionar con métricas del servidor cuando estén disponibles.

## PRUEBAS DE ESFUERZO / ESTRÉS

k6 OSS usa el mismo endpoint verificado, sin login masivo, escrituras o compras. Perfil progresivo 5→10→20 VUs en etapas de 30 s, descenso en 15 s; recuperación con 1 VU durante 30 s a partir de 120 s. Límite fijo 20 VUs, una sola ejecución concurrente. Aborta si error agregado ≥10 % después de 20 s; en recuperación exige p95 <1 s y errores <1 %.

No representa una prueba destructiva de capacidad máxima. Si no se alcanza degradación con 20 VUs, el límite sigue sin determinar. Si aborta anticipadamente, recuperación queda inconclusa y debe observarse después de enfriar el ambiente. Analizar por fase y comparar latencia/errores; no confundir threshold fallido con fallo de infraestructura.

Responsable: IvanRamirezFrancisco, análisis Tackalay. La carga usa solo `workflow_dispatch` y confirmación del ambiente autorizado, nunca PR ni producción. En PR se ejecuta únicamente `k6 inspect`, sin HTTP. La configuración ausente omite los jobs remotos y deja un resumen NO EJECUTADO. Sin `K6_BASE_URL`, `K6_AUTHORIZED_ORIGIN` y `K6_TEST_AUTHORIZED=true`, el script falla antes de enviar solicitudes. No seguir redirecciones ni desactivar TLS. Cambiar carga máxima requiere revisión y autorización del propietario.

## Cobertura y criterios de salida

Medir `src/app/**/*.ts`, excluyendo specs y modelos de tipos (no lógica ejecutable); incluye archivos sin pruebas. V8 con versión igual a Vitest. Reportes text, HTML, lcov y json-summary. Gate CI: 60 % en statements/branches/functions/lines. Metas: baseline 60 %, intermedio 70 %, lógica crítica 80 % cuando sea viable; comprobar cada métrica, no solo líneas. El denominador actual es código demo, no HU completadas ni seguridad del backend.

Entrada: alcance y criterios PF/PS revisados, commit identificable, datos sintéticos, herramientas compatibles; para remoto, URL/cuenta/permiso. Salida de HU: criterios funcionales y seguridad comprobados, pruebas pertinentes aprobadas, defectos críticos resueltos, evidencia enlazada y revisión del par. La existencia del archivo o un gate de cobertura no satisface por sí solo la Definition of Done.

No cerrar TT/HU por esta entrega parcial. Registrar defectos con HU, pasos, esperado/observado, SHA/ambiente y evidencia sanitizada; ejecutar la regresión afectada tras corregir. Retener artifacts 14 días y descargar los de la entrega antes de su expiración. No publicar cuerpos de respuestas de login, tokens, contraseñas, cookies ni datos personales reales.

## Documentos relacionados

- [TEST_TOOLS.md](TEST_TOOLS.md): herramienta, software, finalidad, justificación, responsable y momento.
- [TEST_SCHEDULE.md](TEST_SCHEDULE.md): XP/HU/actividad/pipeline/evidencia.
- [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md): criterios PF/PS y automatización real.
- [CI_CD_PLAN.md](../devops/CI_CD_PLAN.md): disparadores y configuración.
- [SECURITY_CRITERIA.md](../security/SECURITY_CRITERIA.md): requisitos de seguridad conservados.

## PRUEBAS SMOKE Y ANDROID (REQUISITOS CONSERVADOS)

Antes de cada versión candidata comprobar instalación del APK, apertura, login, navegación principal, teclado y ausencia de bloqueo. Repetir con pérdida/restablecimiento de conectividad, persistencia/expiración de sesión e integración Capacitor cuando existan esas capacidades. Los escenarios 5xx, token expirado y errores de red/API requieren implementación/ambiente controlado; siguen PENDIENTES y no se sustituyen por respuestas demo. La seguridad definitiva de precio, stock, propiedad de carrito/pedido/perfil corresponde al servidor.

| ESTADO DE CASO | SIGNIFICADO |
|---|---|
| PENDIENTE | Aún no ejecutado |
| APROBADA | Ejecución real obtuvo el resultado esperado |
| FALLIDA | La ejecución difiere del resultado esperado |
| BLOQUEADA | Falta una dependencia/ambiente/capacidad identificada |

Para implementación documental se usan IMPLEMENTADO, PARCIAL y PLANIFICADO; esos estados no equivalen a APROBADA de un caso PF/PS. Ivan Francisco Ramírez mantiene integración técnica, API/seguridad/CI/Android; Brayan Lara Barrios (Tackalay) mantiene frontend, funcionales, regresión y resultados. Ambos revisan los PR y actualizan este plan al cambiar requisitos/contrato.
