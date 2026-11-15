# GUÍA HUMANA DE LOS 8 WORKFLOWS DEVOPS

Esta guía explica la arquitectura real del PR #73 para una persona que no conoce GitHub Actions. Un **workflow** es el archivo YAML definido una vez; un **workflow run** es una ejecución concreta de ese archivo para un evento y un SHA. Por eso la pestaña Actions puede mostrar muchos runs sin que existan muchos pipelines distintos.

## Cómo leer el historial

En un Pull Request, cada `commit/push` genera el evento `pull_request` con acción `synchronize`. Los workflows automáticos vuelven a evaluar el cambio. La política `concurrency` cancela el run anterior del mismo PR cuando ya quedó obsoleto; el run nuevo continúa sobre el HEAD más reciente. Los runs manuales, k6 LOAD/STRESS y regresión completa no se cancelan automáticamente porque deben conservar evidencia íntegra.

- Verde: el workflow terminó correctamente para los controles aplicables al evento.
- Rojo: falló un control obligatorio o una dependencia necesaria.
- Gris: el job quedó `SKIPPED` / `NO APLICA`; no prueba que el control haya pasado.
- Cancelado: un run de PR quedó obsoleto y fue sustituido por otro mediante `concurrency`.

Los runs fallidos no se borran: explican defectos, correcciones y decisiones. En PR, el Quality Gate consulta `github.event.pull_request.head.sha`; `github.sha` puede ser un merge SHA temporal sin los check-runs consolidados. En push/entrega usa `github.sha`, que sí identifica el commit integrado y el APK.

## Regla común de alcance

`scripts/detect-change-scope.mjs` compara el bloque introducido por el evento. En `pull_request/synchronize` usa `before → after`; al abrir/reabrir un PR usa `base → head`; en push usa `before → after`. Si todos los archivos están en `docs/**` o terminan en `.md`, los jobs pesados aparecen como `SKIPPED / NO APLICA`. El workflow sigue iniciándose, por lo que los checks no quedan eternamente pendientes. Cualquier archivo ejecutable, configuración, workflow, script, fixture o archivo no clasificable activa los controles completos.

## 1. CI - Calidad

1. **Nombre visible:** CI - Calidad.
2. **Archivo:** `.github/workflows/ci.yml`.
3. **Propósito:** calidad, unitarias, estático, cobertura, build y consolidación del gate.
4. **Razón:** impedir que un cambio ejecutable avance sin controles mínimos reproducibles.
5. **Triggers:** PR/push a `develop` o `main`; manual para diagnóstico.
6. **Eventos:** `pull_request`, `push`, `workflow_dispatch`.
7. **Jobs:** Alcance CI; Lint, Tests y Build; DEVOPS QUALITY GATE.
8. **Steps principales:** checkout, Node, `npm ci`, ESLint, Vitest/coverage, Angular build, artifact, resumen y consulta de check-runs.
9. **Herramientas:** Node 22, npm, ESLint, Vitest, Angular compiler y GitHub Checks API.
10. **Datos:** fixtures/servicios DEMO; no usa backend ni secretos.
11. **Variables/secrets:** `GITHUB_TOKEN`; nombres/timeout del gate como variables del job.
12. **Dependencias:** gate después de CI y espera seis checks del HEAD real.
13. **Paralelo/secuencial:** CI corre en paralelo a Security/Integration/Android/k6; su gate es posterior.
14. **Artifacts:** `coverage-and-unit-tests`, `devops-quality-gate`.
15. **Step Summary:** métricas, controles, SHA evaluado, checks hallados, timeout y acción.
16. **PASS:** lint/tests/build y coverage cumplen; los requeridos del gate están PASS o NO APLICA por regla documental.
17. **FAIL:** comando obligatorio, threshold o check requerido falla.
18. **BLOCKED:** un requerido se omite sin una regla documental válida.
19. **SKIPPED/NO APLICA:** cambio exclusivamente documental; no se afirma que las pruebas se ejecutaron.
20. **Después:** revisión del PR; Staging solo puede consultar un gate PASS del mismo SHA tras integrar.
21. **Relación:** consolida CI, Security, Integration y Android→Acceptance; k6 real/API remota son condicionales.
22. **Ejemplo real:** run 39169917805 tuvo CI PASS y gate FAIL porque consultó el merge SHA temporal; el defecto motiva la selección explícita del HEAD.
23. **Errores comunes:** consultar `github.sha` en PR, renombrar checks sin actualizar gate o confundir NO APLICA con PASS de pruebas.
24. **En Actions:** abrir el job, revisar Summary, artifact de cobertura y comentario único `DEVOPS QUALITY GATE` del PR.

## 2. Security - Análisis

1. **Nombre visible:** Security - Analisis.
2. **Archivo:** `.github/workflows/security.yml`.
3. **Propósito:** dependencias y análisis estático de seguridad.
4. **Razón:** detectar vulnerabilidades de producción y patrones inseguros antes de integrar.
5. **Triggers:** PR/push a `develop` o `main`; manual.
6. **Eventos:** `pull_request`, `push`, `workflow_dispatch`.
7. **Jobs:** Alcance Security; Auditoria de dependencias; CodeQL JavaScript y TypeScript.
8. **Steps:** `npm ci`, audit producción, audit completo informativo, CodeQL init/analyze y resúmenes.
9. **Herramientas:** npm audit y CodeQL v4.
10. **Datos:** `package-lock.json` y código JS/TS del SHA.
11. **Variables/secrets:** token efímero de GitHub; no hay credenciales de aplicación.
12. **Dependencias:** audit y CodeQL no dependen entre sí.
13. **Paralelo/secuencial:** ambos jobs corren en paralelo; los steps internos son secuenciales.
14. **Artifacts:** Code scanning/SARIF y logs; no se versionan secretos.
15. **Step Summary:** diferencia audit producción bloqueante del audit completo informativo.
16. **PASS:** audit producción y CodeQL terminan correctamente.
17. **FAIL:** vulnerabilidad de producción `moderate+` o fallo de CodeQL.
18. **BLOCKED:** permisos de `security-events` o infraestructura de GitHub impiden analizar.
19. **SKIPPED/NO APLICA:** bloque exclusivamente documental.
20. **Después:** el gate consume ambos nombres exactos.
21. **Relación:** paralelo a CI/Integration/Android; complementa, no reemplaza pruebas funcionales.
22. **Ejemplo real:** run 39169917835, audit y CodeQL PASS.
23. **Errores comunes:** interpretar job verde como ausencia absoluta de riesgos o ocultar audit producción con `continue-on-error`.
24. **En Actions:** revisar ambos jobs, summaries y Security → Code scanning para hallazgos.

## 3. INTEGRACIÓN - Frontend y API

1. **Nombre visible:** INTEGRACIÓN - Frontend y API.
2. **Archivo:** `.github/workflows/integration.yml`.
3. **Propósito:** integración TestBed local y contratos API autorizados.
4. **Razón:** separar comportamiento frontend DEMO de una integración Spring Boot real todavía no conectada.
5. **Triggers:** PR/push para frontend; manual para API.
6. **Eventos:** `pull_request`, `push`, `workflow_dispatch` con suite elegida.
7. **Jobs:** Alcance Integration; frontend; configuration; api.
8. **Steps:** npm/TestBed/JUnit; comprobar ambiente; instalar Postman CLI; ejecutar colección y publicar resultado.
9. **Herramientas:** Vitest, Angular TestBed y Postman CLI 1.75.0.
10. **Datos:** fixtures DEMO; API usa cuenta/token sintéticos del ambiente testing.
11. **Variables/secrets:** URLs/IDs en Variables; token/email/password en Secrets.
12. **Dependencias:** configuration → api; frontend independiente.
13. **Paralelo/secuencial:** frontend corre paralelo a otros workflows; API es secuencial tras configuración.
14. **Artifacts:** `frontend-integration`, `api-contract-results` solo si API ejecuta.
15. **Step Summary:** frontend PASS/FAIL; API SKIPPED/BLOCKED/resultado real separado.
16. **PASS:** casos TestBed pasan; API solo PASS si ejecutó contratos reales.
17. **FAIL:** aserción frontend o contrato remoto habilitado falla.
18. **BLOCKED:** falta URL/origen/autorización o fixture secreto.
19. **SKIPPED/NO APLICA:** API en PR; todo el control pesado en cambio documental.
20. **Después:** `frontend` alimenta el gate; la evidencia API complementa cierres manuales.
21. **Relación:** no afirma integración móvil↔backend mientras la app use servicios DEMO.
22. **Ejemplo real:** run 39169918025: frontend PASS; configuration/api SKIPPED en PR.
23. **Errores comunes:** inventar endpoint, guardar token en colección o llamar PASS a un job omitido.
24. **En Actions:** distinguir el job `frontend` verde de los jobs API grises y leer el Summary.

## 4. Android - Build Debug APK

1. **Nombre visible:** Android - Build Debug APK.
2. **Archivo:** `.github/workflows/android-build.yml`.
3. **Propósito:** BUILD Android y entrega del APK Debug a Acceptance.
4. **Razón:** comprobar la cadena Angular → Capacitor → Gradle y producir el artefacto exacto probado.
5. **Triggers:** PR/push a `develop/main`, manual y `workflow_call`.
6. **Eventos:** automáticos, dispatch y reutilización desde Regression.
7. **Jobs:** Alcance Android; Compilar APK Android Debug; ACEPTACIÓN móvil DEMO.
8. **Steps:** Node/Java/Gradle, npm build, cap sync, assembleDebug, verificación y artifact.
9. **Herramientas:** Angular, Capacitor, Java 21, Gradle y Android SDK.
10. **Datos:** código/assets del SHA; no usa backend.
11. **Variables/secrets:** ninguna credencial de aplicación.
12. **Dependencias:** Android Build → APK → Acceptance reusable.
13. **Paralelo/secuencial:** paralelo a otros workflows; internamente estrictamente secuencial.
14. **Artifacts:** `casa-musica-castillo-debug-apk`.
15. **Step Summary:** estados de Angular, Capacitor, Gradle y existencia del APK.
16. **PASS:** artifact existe y el job de Acceptance posterior pasa para el workflow completo.
17. **FAIL:** build/sync/Gradle/APK o Acceptance falla.
18. **BLOCKED:** runner/SDK no puede preparar herramientas.
19. **SKIPPED/NO APLICA:** cambio documental; Acceptance también se omite al no existir APK nuevo.
20. **Después:** APK se consume por Acceptance; el gate consulta ambos checks.
21. **Relación:** es BUILD, no prueba unitaria; llama `acceptance.yml`.
22. **Ejemplo real:** run 39169917733 generó APK y terminó con Maestro PASS.
23. **Errores comunes:** presentar APK generado como versión aprobada antes de Acceptance/gate.
24. **En Actions:** comprobar secuencia de jobs y descargar el APK con su SHA/run visible.

## 5. ACEPTACIÓN - Maestro Android DEMO

1. **Nombre visible:** ACEPTACIÓN - Maestro Android DEMO.
2. **Archivo:** `.github/workflows/acceptance.yml`.
3. **Propósito:** PRUEBAS DE ACEPTACIÓN UI móvil sobre estado DEMO.
4. **Razón:** validar recorridos observables en una app instalada sin depender de Maestro Cloud.
5. **Triggers:** únicamente `workflow_call`.
6. **Eventos:** heredados del caller Android/Regression.
7. **Jobs:** maestro.
8. **Steps:** descargar APK, Java/KVM, Maestro, emulador AOSP API34, JUnit/logs/capturas.
9. **Herramientas:** Maestro CLI 2.11.0 y Android Emulator.
10. **Datos:** credenciales/productos DEMO reproducibles de `.maestro`.
11. **Variables/secrets:** analytics deshabilitado; sin secretos reales.
12. **Dependencias:** requiere el APK publicado por el caller del mismo run.
13. **Paralelo/secuencial:** después de Android; Maestro gestiona sus flujos dentro del job.
14. **Artifacts:** `acceptance-maestro-demo`.
15. **Step Summary:** 3 flujos, ambiente AOSP y advertencia de que no acredita backend.
16. **PASS:** los tres flujos finalizan y generan evidencia.
17. **FAIL:** arranque, selector o aserción falla.
18. **BLOCKED:** emulador/KVM/descarga del APK no disponibles.
19. **SKIPPED/NO APLICA:** Android no produjo APK o el cambio fue solo documental.
20. **Después:** su check obligatorio alimenta el gate.
21. **Relación:** reusable desde Android y Regression; la cancelación del caller cancela esta cadena.
22. **Ejemplo real:** job `ACEPTACIÓN móvil DEMO / maestro` del run 39169917733 PASS.
23. **Errores comunes:** confundir UI DEMO con aceptación backend o reintentar sin diagnosticar un fallo reproducible.
24. **En Actions:** abrir el job llamado con formato `caller / maestro`, revisar JUnit/capturas y tiempos.

## 6. REGRESIÓN - Suite crítica

1. **Nombre visible:** REGRESIÓN - Suite crítica.
2. **Archivo:** `.github/workflows/regression.yml`.
3. **Propósito:** regresión completa bajo decisión humana.
4. **Razón:** evitar duplicar automáticamente en cada PR las suites rápidas ya cubiertas.
5. **Triggers:** solo manual.
6. **Eventos:** `workflow_dispatch`.
7. **Jobs:** critical; android-critical, que reutiliza Android→Acceptance.
8. **Steps:** npm/TestBed/JUnit y cadena Android/Maestro.
9. **Herramientas:** Vitest, TestBed, Capacitor, Gradle y Maestro.
10. **Datos:** fixtures DEMO y APK del SHA seleccionado.
11. **Variables/secrets:** no usa credenciales reales.
12. **Dependencias:** Critical → Android critical → Acceptance.
13. **Paralelo/secuencial:** secuencial por diseño.
14. **Artifacts:** `critical-regression`, APK y `acceptance-maestro-demo`.
15. **Step Summary:** frontend reporta su estado sin anticipar Android/Maestro.
16. **PASS:** todas las etapas del run manual pasan.
17. **FAIL:** cualquier etapa obligatoria falla y detiene la siguiente.
18. **BLOCKED:** herramientas/emulador no disponibles.
19. **SKIPPED/NO APLICA:** no se solicitó dispatch; no se interpreta como aprobación.
20. **Después:** evidencia para cierre XP/candidato, no reemplaza gate cotidiano.
21. **Relación:** reutiliza `android-build.yml` y `acceptance.yml`.
22. **Ejemplo real:** validación local 16 archivos/53 casos PASS; no se inventa un run remoto manual.
23. **Errores comunes:** duplicar los mismos 127 casos en cada evento o presentar preparación como ejecución.
24. **En Actions:** elegir workflow manual, SHA correcto y revisar cada etapa en orden.

## 7. RENDIMIENTO Y ESFUERZO - k6 autorizado

1. **Nombre visible:** RENDIMIENTO Y ESFUERZO - k6 autorizado.
2. **Archivo:** `.github/workflows/performance.yml`.
3. **Propósito:** validar scripts en PR y ejecutar LOAD/STRESS solo con autorización.
4. **Razón:** asegurar sintaxis/umbrales sin atacar por accidente un ambiente.
5. **Triggers:** PR para inspect; manual para un escenario real.
6. **Eventos:** `pull_request`, `workflow_dispatch`.
7. **Jobs:** Alcance Performance; validate; configuration; PERFORMANCE/LOAD; STRESS/ESFUERZO.
8. **Steps:** instalar k6, inspect sin red, validar ambiente y ejecutar el escenario seleccionado.
9. **Herramientas:** k6 OSS.
10. **Datos:** `example.invalid` en inspect; URL/dataset testing en ejecución real.
11. **Variables/secrets:** `K6_BASE_URL`, `K6_AUTHORIZED_ORIGIN`, `K6_TEST_AUTHORIZED`; secretos solo si el endpoint autorizado los necesita.
12. **Dependencias:** validate + configuration → LOAD o STRESS.
13. **Paralelo/secuencial:** inspect de PR paralelo; escenario real posterior a configuración.
14. **Artifacts:** `performance-load` o `performance-stress` solo si hubo carga.
15. **Step Summary:** SCRIPT PASS separado de LOAD/STRESS SKIPPED/NO EJECUTADO.
16. **PASS:** inspect valida scripts; un rendimiento real solo pasa si ejecuta y cumple thresholds.
17. **FAIL:** sintaxis o threshold real incumplido.
18. **BLOCKED:** falta ambiente/autorización/confirmación.
19. **SKIPPED/NO APLICA:** carga real en PR; todo inspect en cambio documental.
20. **Después:** un operador programa la carga; no alimenta required checks remotos cotidianos.
21. **Relación:** paralelo al resto en PR; manual y no cancelable para preservar evidencia.
22. **Ejemplo real:** run 39169917735: inspect PASS; LOAD/STRESS SKIPPED.
23. **Errores comunes:** llamar PASS de rendimiento a `k6 inspect`, usar producción o superar 20 VUs.
24. **En Actions:** leer Summary y comprobar que no existen métricas p90/p95 cuando no hubo carga.

## 8. Release - Staging APK

1. **Nombre visible:** Release - Staging APK.
2. **Archivo:** `.github/workflows/staging-apk.yml`.
3. **Propósito:** BUILD/entrega de APK staging después del gate.
4. **Razón:** evitar presentar como aprobada una compilación cuyo mismo SHA falló controles.
5. **Triggers:** push a `develop`; manual para un SHA ya validado.
6. **Eventos:** `push`, `workflow_dispatch`.
7. **Jobs:** Alcance Staging; Verificar DEVOPS QUALITY GATE; Generar APK de Staging.
8. **Steps:** detectar alcance, consultar check del SHA, build/sync/Gradle, renombrar/publicar APK y resumen.
9. **Herramientas:** Checks API, Angular, Capacitor y Gradle.
10. **Datos:** código/assets del commit integrado.
11. **Variables/secrets:** `GITHUB_TOKEN`; sin credenciales de firma/release.
12. **Dependencias:** Quality Gate del mismo `github.sha` → Staging.
13. **Paralelo/secuencial:** estrictamente secuencial; push posterior cancela entrega aún obsoleta, dispatch manual no.
14. **Artifacts:** `staging-quality-gate`, `casa-musica-castillo-staging-<run>`.
15. **Step Summary:** gate, build, sync, Gradle, verificación y acción.
16. **PASS:** gate del mismo SHA PASS y APK existe.
17. **FAIL:** gate FAIL/BLOCKED/PENDING/timeout o build falla.
18. **BLOCKED:** el gate aún no existe o no es terminal.
19. **SKIPPED/NO APLICA:** push exclusivamente documental; no se genera un APK nuevo.
20. **Después:** artifact disponible para evaluación; no publica Play Store.
21. **Relación:** consumidor secuencial del `DEVOPS QUALITY GATE`, no pipeline de unitarias.
22. **Ejemplo real:** el workflow histórico de baseline generó staging; el PR no ejecuta staging porque todavía no fue integrado.
23. **Errores comunes:** consultar merge SHA de PR, compilar antes del gate o llamar release firmado a un Debug APK.
24. **En Actions:** verificar primero el job gate, luego el artifact y que ambos muestran el mismo SHA.

## Concurrency y conservación de evidencia

| Workflow | PR obsoleto | Push obsoleto | Manual |
|---|---|---|---|
| CI, Security, Integration, Android, k6 inspect | Se cancela | Se conserva | Se conserva |
| Acceptance | Lo cancela su caller Android | Lo gestiona su caller | Lo gestiona su caller |
| Regression | No aplica | No aplica | Se conserva completo |
| Staging | No aplica | Se cancela si llega otro push a `develop` | Se conserva completo |

Esta política reduce consumo sin borrar historial. Una cancelación es trazabilidad explícita, no una prueba aprobada ni un intento de ocultar un fallo.
