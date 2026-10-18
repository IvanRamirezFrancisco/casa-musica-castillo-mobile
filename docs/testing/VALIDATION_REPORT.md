# EVIDENCIA DE VALIDACIÓN — RAMA DE PRUEBAS

## ESTADO INICIAL REAUDITADO

Continuidad verificada el 12/10/2026 (México; 13/10 UTC): develop `fc071671adea59d09776c0bc718a089ca3488327`, cuatro workflows existentes exitosos. Único PR abierto: #71, ajeno a esta actividad y sin modificar. Rama remota chore/test-pipelines-completion ausente; se encontraron borradores locales de esta actividad sin commit, basados en el mismo develop, revisados antes de reutilizarlos.

23 specs en develop, sin coverage configurado. No HttpClient/HttpTesting ni apiUrl; dos servicios demo. Backend leído sin modificar, SHA `46bc32d8b0417370ab35e99866cabbeaaf830bba`. Project y asignaciones HU verificadas, sin cambiar metadata.

## RESULTADOS LOCALES REEJECUTADOS

Entorno: Linux, Node 24.19.0, npm 11.9.0; CI conserva Node 22. Versiones del lock: Angular 22.2.1, TypeScript 6.0.3, Vitest y coverage-v8 4.0.18.

| COMANDO | RESULTADO | EVIDENCIA |
|---|---|---|
| `git fetch origin` | PASS; develop sin cambios respecto al SHA auditado | Referencias Git |
| `npm ci` | PASS | Instalación reproducible desde lock |
| `npm run lint` | PASS | Todas las fuentes/plantillas sin errores lint |
| `npm test -- --configuration=ci` | PASS: 26 archivos, 103 pruebas | reports/unit-tests.xml; coverage/app |
| `npm run test:integration` | PASS: 1 archivo, 4 pruebas | reports/integration-tests.xml |
| `npm run test:regression` | PASS: 16 archivos, 47 pruebas | reports/regression-tests.xml |
| `npm run test:coverage` | PASS: 103 pruebas y baseline 60 % en las cuatro métricas | coverage/app/coverage-summary.json y HTML/lcov |
| `npm run build` | PASS | www; warnings preexistentes de Browserslist/budgets, sin ampliar límites |
| `actionlint 1.7.12 -shellcheck= -pyflakes=` | PASS | Validación semántica YAML Actions; shellcheck/pyflakes no instalados |
| `node --check` scripts/API/k6 + `bash -n scripts/install-k6.sh` | PASS | Sintaxis de scripts |
| `k6 inspect ... load.js` / `stress.js` | PASS sin solicitudes | Opciones de escenarios; no prueba de rendimiento |
| `node scripts/validate-api-tooling.mjs` con Postman 1.73.0 en PATH | PASS: 8 solicitudes, 26 aserciones contra loopback sintético | reports/api-tooling-SYNTHETIC.xml; NO es evidencia del backend |
| Parse YAML de workflows/flujos | PASS | Parser YAML; no sustituye ejecución Maestro |
| API remota real | NO EJECUTADA | Falta ambiente autorizado/fixture |
| k6 LOAD/STRESS remoto | NO EJECUTADO | Falta K6_BASE_URL autorizada |
| Maestro Android local | NO EJECUTADO | Entorno local sin SDK/emulador; se validará en Actions |

Postman CLI funcionó sin login/API key para la colección local y JUnit. Muestra aviso de credenciales solo para publicar en su cloud; no se inició sesión ni se publicó allí. El arnés valida herramientas y aserciones contra respuestas sintéticas, no corrección de Spring Boot.

## COBERTURA REAL

| MÉTRICA | CUBIERTO / TOTAL | PORCENTAJE |
|---|---:|---:|
| Sentencias | 369 / 441 | 83,67 % |
| Ramas | 287 / 310 | 92,58 % |
| Funciones | 116 / 168 | 69,04 % |
| Líneas | 228 / 279 | 81,72 % |

Baseline 60 % en las cuatro métricas: alcanzado. Meta intermedia 70 % global: NO alcanzada en funciones. Meta 80 % en lógica crítica: evaluar por archivo/flujo; no declarada globalmente. Cobertura representa el código demo existente, no funcionalidades de las 14 HU ni seguridad completa.

## GITHUB ACTIONS Y PULL REQUEST

Continuación del 13/10/2026: rama remota confirmada inicialmente en `871de06`, basada en develop `fc07167`. Publicación completada en la misma rama mediante el navegador autorizado (Git/connector carecían de autenticación/permisos de escritura). Se verificó el contenido remoto contra la versión local validada.

PR abierto hacia develop: [#73](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/pull/73), sin merge. Los siete comandos npm se reejecutaron el 13/10 y pasaron. Postman sintético: 8 requests / 26 assertions aprobadas; no se ejecutó API real ni carga remota.

| WORKFLOW / JOB | EJECUCIÓN REAL SOBRE `8437a39` | RESULTADO / ARTIFACT |
|---|---|---|
| CI - Calidad | [38397492970](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/38397492970) | APROBADO: lint/tests/build; coverage-and-unit-tests |
| INTEGRACIÓN frontend | [38397493060](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/38397493060) | APROBADO; frontend-integration. API/configuration OMITIDOS por ser PR |
| Security audit / CodeQL | [38397492985](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/38397492985) | APROBADOS; no acredita todas las PS |
| k6 validación | [38397493310](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/38397493310) | APROBADO inspect; LOAD/STRESS no ejecutados |
| Android build | [38397493478](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/38397493478) | APK compilado e instalado; casa-musica-castillo-debug-apk |
| Maestro primera ejecución | Mismo run Android | FALLÓ: 3/3 flujos no localizaron placeholder de correo. acceptance-maestro-demo conserva JUnit, capturas y jerarquías |

La jerarquía Android mostró IDs reales `cmc-input-0` y `cmc-input-1`; se corrigió el selector del login compartido, sin eliminar pruebas ni cambiar la app. La ejecución posterior se consulta en los [checks del PR](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/pull/73/checks). Este registro conserva el fallo observado y no presupone el resultado de la reejecución.

Reejecuciones: 38398640514 aprobó pedidos/perfil; se corrigió el selector de radio con texto agrupado y se evitó relanzar/limpiar dos veces dentro del flujo auth. En 38400022024 aprobaron auth y pedidos/perfil. Compra falló porque Android mató el proceso: `depends on provider com.google.android.gms/.fonts.provider.FontsProvider in dying proc`. Se cambió el emulador a AOSP `default` API 34/x86_64 (disponibilidad comprobada en XML oficial SDK) sin modificar el APK ni omitir pruebas.

## VERIFICACIÓN APROBADA SOBRE `3057af9`

Todos los workflows activados en el PR aprobaron el 13/10/2026. La aceptación ejecutó realmente **3/3 flujos DEMO**: pedidos/perfil (43 s), compra/entrega/pago/confirmación demo (50 s) y autenticación/navegación (31 s); total 2 min 4 s. No equivale a aprobación de transacciones, autenticación o aislamiento en backend.

| WORKFLOW | RUN APROBADO | ARTIFACT REAL |
|---|---|---|
| CI | [38401960769](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/38401960769) | coverage-and-unit-tests: HTML/lcov/JUnit |
| INTEGRACIÓN frontend | [38401960752](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/38401960752) | frontend-integration: JUnit |
| SECURITY | [38401960884](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/38401960884) | audit/CodeQL en logs/alertas |
| k6 INSPECT | [38401960948](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/38401960948) | validación sin solicitudes; sin métricas de carga |
| ANDROID + ACEPTACIÓN DEMO | [38401961421](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/38401961421) | casa-musica-castillo-debug-apk y acceptance-maestro-demo: JUnit/capturas/logs |

Artifacts comprobados existentes y no expirados. Tras cambios documentales se consultan los checks del SHA más reciente del PR; esta tabla identifica exactamente el SHA y los runs ejecutados. API remota, LOAD/STRESS y PF/PS de backend siguen PENDIENTES.

Evidencia añadida y comprobada en TT-42–TT-50 (#61–#69), todas abiertas. Project/HU/iteraciones/responsables conservados. Regresión local: 47 tests; CI reejecuta 103. regression.yml manual reutiliza suites/Android; un nuevo dispatch requiere que GitHub habilite ese workflow en la rama predeterminada. No se modifica main ni se hace merge para forzarlo.

## CIERRE ACADÉMICO Y CHECKS DEL PR #73

Continuidad confirmada el 13/10/2026 sobre la rama existente, HEAD remoto `1d7bc3f57892263527ef6f12ae25c18e50d8f630`, base develop `fc071671adea59d09776c0bc718a089ca3488327`. No se creó otro PR/rama ni se modificaron main, develop, PR #71, backend o estados de Issues.

El intento 1 del [run 38403949090](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/38403949090/attempts/1), job 115319348301, aprobó autenticación y pedidos/perfil, pero falló al esperar `Bienvenido de nuevo` en el arranque de compra. Su artifact `acceptance-maestro-demo` confirma en logcat: limpieza de datos a las 13:23:00, arranque del proceso 2763 a las 13:23:01.671 y **`Destroy timeout of remove-task` / `Killing 2763 ... remove task`** a las 13:23:01.812–.813. Es una carrera de destrucción de la tarea anterior durante el nuevo arranque; no un fallo del selector de compra ni del proveedor GMS en AOSP. Se reejecutó únicamente el job fallido (intento 2) antes de considerar cambios.

**Reintento confirmado:** [run 38403949090, intento 2](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/actions/runs/38403949090/attempts/2), job 115357239634, aprobado. Maestro ejecutó **3/3 flujos DEMO**: pedidos/perfil 45 s, compra 51 s y autenticación 33 s (2 min 9 s). Artifact real `acceptance-maestro-demo` ID 11823377777, JUnit/capturas/logs. Resolución del último fallo: reejecución del job transitorio; ningún cambio de APK, selector, pruebas, timeout o controles.

| CHECK EN SHA `1d7bc3f` | RUN | ESTADO VERIFICADO |
|---|---|---|
| CI - Calidad | 38403948989 | PASS |
| INTEGRACIÓN frontend | 38403949027 | PASS; API omitida en PR |
| Security audit / CodeQL | 38403948889 | PASS |
| k6 validación | 38403948949 | PASS; LOAD/STRESS omitidos |
| Android APK + ACEPTACIÓN DEMO | 38403949090, intento 2 | PASS; Maestro 3/3 ejecutados |

La publicación de este cierre documental produce un nuevo SHA y nuevas ejecuciones. Su SHA final y runs se registran en el comentario de cierre del [PR #73](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/pull/73); los [checks](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/pull/73/checks) deben corresponder a ese HEAD. Esta tabla conserva evidencia ejecutada sobre el SHA indicado y no anticipa el resultado de commits posteriores.

### COMPROBACIÓN DE LOS TRES REQUISITOS DOCENTES

| REQUISITO | EVIDENCIA VERSIONADA | ALCANCE |
|---|---|---|
| 1. Definir y calendarizar siete tipos por requerimiento, módulo y sprint | TEST_PLAN + TEST_SCHEDULE: diez columnas explícitas y correspondencia de las 14 HU con módulos/sprints reales del Project, verificada el 13/10 | Definición/planeación completa; ejecución distingue DEMO, PLANIFICADO y PENDIENTE |
| 2. Recursos/software y justificación | TEST_TOOLS: herramienta, finalidad/justificación, evidencia, responsable y momento/lugar de ejecución | Herramientas existentes conservadas; versiones y fuentes oficiales documentadas |
| 3. Pipelines por tipo | CI_CD_PLAN y ocho workflows existentes | ci: unitarias/estático/coverage; integration: integración; Android→acceptance: aceptación; regression: regresión reutilizada; performance: carga/estrés manual; security: complementaria; Android/staging: compilación/entrega |

En Word/PDF las actividades de prueba irán **EN MAYÚSCULAS y en azul #1F4E79**. El calendario no simula color en Markdown. Implementar la infraestructura no convierte API/carga remota ni PF/PS de backend en PASS.

## PENDIENTES FUNCIONALES

API móvil real, guards/sesión/HTTP, catálogo/búsqueda/detalle/favoritos completos y contrato cliente de checkout/pedidos permanecen fuera de la implementación actual. Casos PF/PS sin evidencia siguen PENDIENTES. Se conserva main/develop, backend, PR #71 e Issues abiertas.

## CAPTURAS PARA LA ENTREGA

1. PR con base develop, rama de pruebas, commits y checks del SHA final.
2. Job CI: pruebas aprobadas, cuatro porcentajes y artifact coverage-and-unit-tests; abrir HTML por archivo.
3. Job INTEGRACIÓN frontend: cuatro casos, JUnit; distinguir API omitida/bloqueada.
4. Security: audit producción y CodeQL; no afirmar cero alertas solo por job verde.
5. Android: APK del mismo SHA y, si se ejecuta, JUnit/capturas reales Maestro.
6. Performance: inspect sin red, scripts/umbrales y resumen NO EJECUTADO si no hay ambiente. No presentar gráficos de carga inexistentes.
7. TEST_SCHEDULE con REQUERIMIENTO/HU + MÓDULO + SPRINT/ITERACIÓN XP + tipo/objetivo/herramienta/responsable/pipeline/evidencia/estado; títulos coloreados en Word/PDF.
8. Issues TT-42–50 con referencia al PR/evidencia y estado abierto; Project con iteraciones reales.

Descargar artifacts antes de su expiración. Ocultar secretos/tokens/correos reales al capturar. Fechar toda evidencia y conservar SHA.

## CORRECCIÓN DOCENTE — QUALITY GATE Y RETROALIMENTACIÓN (18/10/2026)

La rama `chore/test-pipelines-completion` se integró mediante merge sin reescritura con `develop` `c3d78a88fc68282598b6eb8869102a83da77b10f` (PR #74). No se modificaron main/develop ni PR #71 y no se cerraron Issues. El catálogo incorporado por develop se conserva y se sigue declarando DEMO.

### Planeación en GitHub Project

Se auditaron 69 elementos del Product Backlog: 14 HU, 50 TT y 5 PV. Los campos visibles aplicables —Responsable, Iteración XP, Status, Prioridad, Tipo, Módulo, Etapa DevOps y Story Points— estaban completos; no se inventaron reasignaciones. Se corrigió la vista **Cronograma XP** seleccionando `Iteración XP start` y `Iteración XP end`, se guardó como configuración compartida y se verificaron elementos sobre XP1–XP5. `CIERRE` se mantiene como periodo académico documental, no como iteración inexistente en el Project.

### RETROALIMENTACIÓN DE PRUEBAS AUTOMATIZADAS

Los ocho workflows usan `scripts/write-workflow-summary.mjs` para publicar en `$GITHUB_STEP_SUMMARY`: evento, SHA, rama, PR, controles ejecutados, datos/ambiente, resultado de cada control, métricas, artifacts, estado general y acción recomendada. `performance.yml` declara de forma separada `SCRIPT k6: PASS` de `LOAD REAL: SKIPPED` y `STRESS REAL: SKIPPED`; Integration declara API `BLOCKED` o `SKIPPED` cuando no existe ambiente. No se presenta un check verde de configuración como prueba remota aprobada.

`ci.yml` incorpora el job **DEVOPS QUALITY GATE**, que consulta por API seis nombres exactos del mismo SHA: Lint/Tests/Build, integración frontend, audit producción, CodeQL, Android y Maestro. Genera JSON/Step Summary y actualiza un único comentario marcado del PR. El gate falla ante FAIL, BLOCKED, SKIPPED, ausencia o timeout. `staging-apk.yml` consulta el gate del mismo SHA y solo construye la entrega después de PASS; no duplica suites ni crea un noveno workflow.

### Resultados locales sobre `fe552eb`

| CONTROL | RESULTADO REAL |
|---|---|
| `npm ci` | PASS, 501 paquetes desde lock |
| `npm run lint` | PASS |
| Unitarias/coverage | PASS: 27 archivos, 127 pruebas |
| Integración frontend | PASS: 1 archivo, 4 pruebas |
| Regresión crítica | PASS: 16 archivos, 53 pruebas |
| Coverage | PASS: statements 85.88%, branches 92.93%, functions 72.77%, lines 84.82% |
| `npm run build` | PASS; ocho warnings SCSS de budget no bloqueantes |
| actionlint 1.7.12 | PASS para ocho workflows |
| Quality Gate con fixture | PASS; seis check-runs sintéticos, no sustituye PR real |
| k6 inspect | PASS para LOAD/STRESS, cero tráfico; pruebas reales SKIPPED |
| Postman CLI 1.75.0 + loopback | PASS: 8 requests/26 assertions; backend real BLOCKED |
| YAML Maestro | PASS sintáctico; ejecución Android actual pendiente de Actions |

La primera ejecución después de integrar develop detectó una regresión real en el test de carrito: el selector conservaba un `aria-label` anterior. Se sustituyó por la clase semántica estable del botón y se añadió la aserción de dos botones; las tres suites afectadas pasaron después. No se eliminó ni relajó ninguna prueba.

### Annotations y decisiones

| ORIGEN | OBSERVACIÓN | DECISIÓN |
|---|---|---|
| Runner GitHub | `ubuntu-latest` migra a Ubuntu 26.04 desde 19/10/2026 | Accionable: los ocho workflows quedaron fijados en `ubuntu-24.04` para reproducibilidad durante esta actividad |
| Angular/Browserslist | Lista fija incluía navegadores fuera del soporte de Angular 22 | Accionable: `.browserslistrc` usa el Baseline oficial de Angular 22 (2026-05-07); el warning desapareció |
| Postman CLI | 1.73.0 indicó que 1.75.0 estaba disponible | Accionable: 1.75.0 se instaló y validó con 8 requests/26 assertions sintéticas antes de actualizar workflow/documentación |
| Angular build | Ocho estilos superan el warning de 2 kB, sin alcanzar error de 4 kB | Informativa y visible: no se aumentaron presupuestos ni se ocultó; optimización UI queda como deuda separada |
| Gradle Wrapper | 8.14.3 puede mostrar versión más nueva disponible | Informativa: no se actualiza sin comprobar la matriz Android Gradle Plugin/Capacitor; el build del wrapper es el control aplicable |
| Maestro/emulador | Mensajes de `colorbuffer`/archivos ini en runs aprobados | Informativa del runner AOSP si 3/3 flujos y JUnit pasan; un fallo de flujo sigue siendo bloqueante |
| npm entorno local | `http-proxy` será desconocido en próximo npm mayor | Externo al repositorio; Node 22/lock siguen reproducibles y no se modifica configuración del runner anfitrión |

Fuentes técnicas verificadas: Angular 22 define Baseline 2026-05-07; GitHub anunció la migración de `ubuntu-latest` a 26.04 entre octubre/noviembre de 2026; GitHub documenta `$GITHUB_STEP_SUMMARY` y que los required checks deben pasar. Las decisiones versionadas se comprobarán de nuevo en los runs del SHA publicado.

### Checks y protección

Candidatos obligatorios: `Lint, Tests y Build`, `frontend`, `Auditoria de dependencias`, `CodeQL JavaScript y TypeScript`, `Compilar APK Android Debug`, `ACEPTACIÓN móvil DEMO / maestro` y `DEVOPS QUALITY GATE`. Manuales/condicionales: API remota, regresión completa, k6 LOAD y k6 STRESS. El estado de branch protection se registrará después de que el nuevo nombre del gate exista en GitHub; no se configurará un required check que no aparezca siempre.

Los resultados detallados están en TEST_RESULTS; la función, comando, datos y política PASS/FAIL de cada workflow están en PIPELINE_TEST_MATRIX y TEST_EXECUTION_STANDARD.
