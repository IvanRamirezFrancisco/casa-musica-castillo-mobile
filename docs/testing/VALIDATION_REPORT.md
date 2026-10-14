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
