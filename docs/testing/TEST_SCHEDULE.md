# CALENDARIZACIÓN DE PRUEBAS XP

Verificación del Project el 12/10/2026 por los campos expandidos de las 14 Issues. No se cambiaron sus responsables, estados, relaciones o iteraciones. La primera consulta usó los campos de las Issues; en la reauditoría de continuidad también se verificaron las asignaciones en Product Backlog.

| ITERACIÓN | FECHA ACADÉMICA 2026 | HU EN PROJECT |
|---|---|---|
| XP1 | 28 sep–11 oct | HU-01, HU-02, HU-03 |
| XP2 | 12–25 oct | HU-04, HU-05, HU-06 |
| XP3 | 26 oct–8 nov | HU-07, HU-08 |
| XP4 | 9–22 nov | HU-09, HU-10, HU-11 |
| XP5 | 23 nov–6 dic | HU-12, HU-13, HU-14 |
| CIERRE | 7–13 dic | HU-01–14, evidencias/PV |

**Diferencia observada:** GitHub muestra XP3 del 26 oct al **7 nov**, mientras la calendarización proporcionada termina el **8 nov**. Se conserva la configuración real; el día 8 se reserva académicamente a revisión/cierre y no se declara incorporado al campo del Project. No se atribuyen a XP1 ejecuciones realizadas después de su cierre.

Actividades EN MAYÚSCULAS; en el entregable Word/PDF aplicar fuente azul #1F4E79 (además del texto, no depender solo del color).

| ITERACIÓN XP | HU | TIPO DE PRUEBA / ACTIVIDAD | HERRAMIENTA | RESPONSABLE | PIPELINE | EVIDENCIA | OBJETIVO | ESTADO |
|---|---|---|---|---|---|---|---|---|
| XP1 (plan original) | 01–03 | PRUEBAS UNITARIAS de formularios; definir baseline | Vitest/TestBed/V8 | Tackalay | CI | JUnit/cobertura | Verificar lógica, tipos, plantillas y cobertura | IMPLEMENTADO sobre código actual; ampliar por XP |
| XP1 (plan original) | 01–14 transversal | ANÁLISIS DE CÓDIGO ESTÁTICO y seguridad de dependencias | ESLint/compiler/audit/CodeQL | Ivan | CI/Security | Logs/alertas | Verificar lógica, tipos, plantillas y cobertura | IMPLEMENTADO sobre código actual; ampliar por XP |
| XP1 (plan original) | 01–03 | PRUEBAS DE INTEGRACIÓN y PRUEBAS DE ACEPTACIÓN de autenticación | TestBed/Postman/Maestro | Tackalay + Ivan API | Integration/Android→Acceptance | JUnit/PF/PS/capturas; servidor pendiente | Comprobar contratos y propagación entre componentes | PARCIAL: frontend demo; API pendiente |
| XP2 | 04–06 + 01–03 | PRUEBAS UNITARIAS y ANÁLISIS DE CÓDIGO ESTÁTICO de inicio/catálogo | Vitest/ESLint/compiler | Tackalay + Ivan revisión | CI | Cobertura por archivo/logs | Verificar lógica, tipos, plantillas y cobertura | IMPLEMENTADO sobre código actual; ampliar por XP |
| XP2 | 04–06 | PRUEBAS DE INTEGRACIÓN de catálogo y búsqueda | Postman/TestBed | Ivan API; Tackalay UI | Integration | Contratos 200/400/404; conexión móvil pendiente | Comprobar contratos y propagación entre componentes | PARCIAL: frontend demo; API pendiente |
| XP2 | 01–06 | PRUEBAS DE ACEPTACIÓN y PRUEBAS DE REGRESIÓN del incremento | Maestro/Vitest | Tackalay | Android→Acceptance/Regression | Capturas/JUnit; catálogo UI pendiente | Comprobar recorridos de usuario y detectar regresiones | PARCIAL: flujos demo, backend pendiente |
| XP2 | 04–06 agrupadas | PRUEBAS DE RENDIMIENTO: baseline; DISEÑO DE PRUEBAS DE ESFUERZO / ESTRÉS | k6 | Ivan + Tackalay | Performance manual | Scripts/inspect; métricas solo con URL autorizada | Medir latencia, errores y recuperación sin afectar producción | PENDIENTE: ambiente autorizado |
| XP3 | 07–08 | PRUEBAS UNITARIAS y ANÁLISIS DE CÓDIGO ESTÁTICO detalle/favoritos | Vitest/ESLint/compiler | Tackalay + Ivan | CI | JUnit/cobertura; depende de implementar HU | Verificar lógica, tipos, plantillas y cobertura | IMPLEMENTADO sobre código actual; ampliar por XP |
| XP3 | 07–08,01 | PRUEBAS DE INTEGRACIÓN y seguridad de IDs/aislamiento | Postman/TestBed | Ivan + Tackalay | Integration/Security | PF/PS, cuentas A/B sintéticas | Comprobar contratos y propagación entre componentes | PARCIAL: frontend demo; API pendiente |
| XP3 | 01–08 | PRUEBAS DE ACEPTACIÓN y PRUEBAS DE REGRESIÓN | Maestro/Vitest | Tackalay | Acceptance/Regression | Recorridos ampliados y JUnit | Comprobar recorridos de usuario y detectar regresiones | PARCIAL: flujos demo, backend pendiente |
| XP4 | 09–11 | PRUEBAS UNITARIAS y ANÁLISIS DE CÓDIGO ESTÁTICO de cantidades/totales | Vitest/ESLint/compiler | Tackalay + Ivan | CI | Cobertura crítica y JUnit | Verificar lógica, tipos, plantillas y cobertura | IMPLEMENTADO sobre código actual; ampliar por XP |
| XP4 | 09–11 | PRUEBAS DE INTEGRACIÓN de stock/precio/checkout/idempotencia | Postman/TestBed | Ivan API; Tackalay | Integration | Contrato/fixtures; checkout bloqueado por endpoint ausente | Comprobar contratos y propagación entre componentes | PARCIAL: frontend demo; API pendiente |
| XP4 | 01–11 | PRUEBAS DE ACEPTACIÓN y PRUEBAS DE REGRESIÓN compra | Maestro/Vitest | Tackalay | Acceptance/Regression | APK/JUnit/PF/PS; no confundir demo con compra | Comprobar recorridos de usuario y detectar regresiones | PARCIAL: flujos demo, backend pendiente |
| XP4 | 04–06 agrupadas | PRUEBAS DE RENDIMIENTO y PRUEBAS DE ESFUERZO / ESTRÉS con recuperación | k6 | Ivan ejecuta; Tackalay analiza | Performance manual | p90/p95/error/requests por fase | Medir latencia, errores y recuperación sin afectar producción | PENDIENTE: ambiente autorizado |
| XP5 | 12–14 | PRUEBAS UNITARIAS y ANÁLISIS DE CÓDIGO ESTÁTICO pedidos/perfil | Vitest/ESLint/compiler | Tackalay + Ivan | CI | JUnit/cobertura | Verificar lógica, tipos, plantillas y cobertura | IMPLEMENTADO sobre código actual; ampliar por XP |
| XP5 | 11–14 | PRUEBAS DE INTEGRACIÓN y aislamiento entre usuarios | Postman/TestBed | Ivan + Tackalay | Integration | PF/PS y contrato final (pedidos propios pendiente) | Comprobar contratos y propagación entre componentes | PARCIAL: frontend demo; API pendiente |
| XP5 | 01–14 | PRUEBAS DE ACEPTACIÓN y PRUEBAS DE REGRESIÓN integral | Maestro/Vitest | Tackalay | Acceptance/Regression | Evidencia de cada HU, brechas identificadas | Comprobar recorridos de usuario y detectar regresiones | PARCIAL: flujos demo, backend pendiente |
| XP5 | 04–06; ampliar a 09–14 solo tras contrato/permiso | PRUEBAS DE RENDIMIENTO y PRUEBAS DE ESFUERZO / ESTRÉS comparativas | k6 | Ivan + Tackalay | Performance manual | Comparación con baseline; no endpoint inventado | Medir latencia, errores y recuperación sin afectar producción | PENDIENTE: ambiente autorizado |
| CIERRE | 01–14 | REEJECUCIÓN DE LOS SIETE TIPOS DE PRUEBA aplicables y revisión de pendientes | Herramientas anteriores | Ambos | CI/Security/Integration/Regression/Performance | Índice de SHA/runs/artifacts, PV y defectos abiertos | Consolidar evidencia de los siete tipos y defectos restantes | PLANIFICADO |

## Tareas y responsables existentes

TT-42 (#61), TT-44 (#63), TT-48 (#67), TT-49 (#68), TT-50 (#69): Tackalay. TT-43 (#62), TT-45 (#64), TT-46 (#65), TT-47 (#66): IvanRamirezFrancisco. Conservar asignación. Esta ampliación de pruebas se referencia en esas tareas; no crea duplicados ni marca terminación.

El calendario es un plan de ejecución/reejecución, no prueba de cumplimiento. Adelantar pruebas de UI demo no adelanta formalmente las HU. Cada evidencia debe indicar fecha real; requisitos remotos bloqueados se registran y reprograman explícitamente, no se dan por aprobados.
