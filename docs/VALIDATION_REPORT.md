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

PENDIENTE de publicación/verificación al generar este registro local. Actualizar aquí con los enlaces y conclusiones reales del nuevo PR; no reutilizar runs de develop como si validaran estos cambios.

## PENDIENTES FUNCIONALES

API móvil real, guards/sesión/HTTP, catálogo/búsqueda/detalle/favoritos completos y contrato cliente de checkout/pedidos permanecen fuera de la implementación actual. Casos PF/PS sin evidencia siguen PENDIENTES. Se conserva main/develop, backend, PR #71 e Issues abiertas.

## CAPTURAS PARA LA ENTREGA

1. PR con base develop, rama de pruebas, commits y checks del SHA final.
2. Job CI: pruebas aprobadas, cuatro porcentajes y artifact coverage-and-unit-tests; abrir HTML por archivo.
3. Job INTEGRACIÓN frontend: cuatro casos, JUnit; distinguir API omitida/bloqueada.
4. Security: audit producción y CodeQL; no afirmar cero alertas solo por job verde.
5. Android: APK del mismo SHA y, si se ejecuta, JUnit/capturas reales Maestro.
6. Performance: inspect sin red, scripts/umbrales y resumen NO EJECUTADO si no hay ambiente. No presentar gráficos de carga inexistentes.
7. TEST_SCHEDULE con XP/HU/tipo/objetivo/herramienta/responsable/pipeline/evidencia/estado; títulos coloreados en Word/PDF.
8. Issues TT-42–50 con referencia al PR/evidencia y estado abierto; Project con iteraciones reales.

Descargar artifacts antes de su expiración. Ocultar secretos/tokens/correos reales al capturar. Fechar toda evidencia y conservar SHA.
