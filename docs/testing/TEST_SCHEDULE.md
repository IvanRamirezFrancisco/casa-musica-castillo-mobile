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

En el entregable Word/PDF estas actividades deberán mostrarse con color de fuente azul #1F4E79 además de estar EN MAYÚSCULAS. Markdown conserva los títulos; no simula el color del documento final.

## REQUERIMIENTO → MÓDULO → SPRINT → PRUEBA

Módulos y sprints cotejados el 13/10/2026 en [Product Backlog](https://github.com/users/IvanRamirezFrancisco/projects/1), campo **Módulo** de las 14 HU. Se usan sus nombres exactos; Búsqueda y Producto son módulos distintos de Catálogo. Las filas agrupadas enumeran los módulos de todas las HU incluidas, sin inventar un módulo transversal.

| REQUERIMIENTO / HU | MÓDULO DEL PROJECT | SPRINT / ITERACIÓN XP |
|---|---|---|
| HU-01, HU-02, HU-03 | Autenticación | XP1 |
| HU-04 | Inicio | XP2 |
| HU-05 | Catálogo | XP2 |
| HU-06 | Búsqueda | XP2 |
| HU-07 | Producto | XP3 |
| HU-08 | Favoritos | XP3 |
| HU-09, HU-10 | Carrito | XP4 |
| HU-11 | Checkout | XP4 |
| HU-12, HU-13 | Pedidos | XP5 |
| HU-14 | Perfil | XP5 |

Las fechas están en la tabla superior. Un sprint posterior puede reejecutar pruebas de HU de sprints anteriores: es integración/regresión del incremento, sin reasignar la HU en el Project. Las ejecuciones DEMO de octubre no acreditan la terminación de HU futuras.

| REQUERIMIENTO / HU | MÓDULO | SPRINT / ITERACIÓN XP | TIPO DE PRUEBA | OBJETIVO | HERRAMIENTA | RESPONSABLE | PIPELINE | EVIDENCIA | ESTADO |
|---|---|---|---|---|---|---|---|---|---|
| HU-01–03 | Autenticación | XP1 (plan original) | PRUEBAS UNITARIAS de formularios; definir baseline | Verificar lógica, tipos, plantillas y cobertura | Vitest/TestBed/V8 | Tackalay | CI | JUnit/cobertura | PARCIAL: pruebas del código actual; HU completa y casos backend pendientes |
| HU-01–14 transversal | Autenticación; Inicio; Catálogo; Búsqueda; Producto; Favoritos; Carrito; Checkout; Pedidos; Perfil | XP1 (plan original) | ANÁLISIS DE CÓDIGO ESTÁTICO y seguridad de dependencias | Verificar lógica, tipos, plantillas y cobertura | ESLint/compiler/audit/CodeQL | IvanRamirezFrancisco | CI/Security | Logs/alertas | IMPLEMENTADO: lint/build/audit/CodeQL; PS funcionales pendientes |
| HU-01–03 | Autenticación | XP1 (plan original) | PRUEBAS DE INTEGRACIÓN y PRUEBAS DE ACEPTACIÓN de autenticación | Comprobar contratos y propagación entre componentes | TestBed/Postman/Maestro | Tackalay + IvanRamirezFrancisco API | Integration/Android→Acceptance | JUnit/PF/PS/capturas; servidor pendiente | PARCIAL: frontend demo; API pendiente |
| HU-04–06 + 01–03 | Inicio; Catálogo; Búsqueda; Autenticación | XP2 | PRUEBAS UNITARIAS y ANÁLISIS DE CÓDIGO ESTÁTICO de inicio/catálogo | Verificar lógica, tipos, plantillas y cobertura | Vitest/ESLint/compiler | Tackalay + IvanRamirezFrancisco revisión | CI | Cobertura por archivo/logs | PARCIAL: pruebas del código actual; HU completa y casos backend pendientes |
| HU-04–06 | Inicio; Catálogo; Búsqueda | XP2 | PRUEBAS DE INTEGRACIÓN de catálogo y búsqueda | Comprobar contratos y propagación entre componentes | Postman/TestBed | IvanRamirezFrancisco API; Tackalay UI | Integration | Contratos 200/400/404; conexión móvil pendiente | PARCIAL: frontend demo; API pendiente |
| HU-01–06 | Autenticación; Inicio; Catálogo; Búsqueda | XP2 | PRUEBAS DE ACEPTACIÓN y PRUEBAS DE REGRESIÓN del incremento | Comprobar recorridos de usuario y detectar regresiones | Maestro/Vitest | Tackalay | Android→Acceptance/Regression | Capturas/JUnit; catálogo UI pendiente | PARCIAL: flujos demo, backend pendiente |
| HU-04–06 agrupadas | Inicio; Catálogo; Búsqueda | XP2 | PRUEBAS DE RENDIMIENTO: baseline; DISEÑO DE PRUEBAS DE ESFUERZO / ESTRÉS | Medir latencia, errores y recuperación sin afectar producción | k6 | IvanRamirezFrancisco + Tackalay | Performance manual | Scripts/inspect; métricas solo con URL autorizada | PENDIENTE: ambiente autorizado |
| HU-07–08 | Producto; Favoritos | XP3 | PRUEBAS UNITARIAS y ANÁLISIS DE CÓDIGO ESTÁTICO detalle/favoritos | Verificar lógica, tipos, plantillas y cobertura | Vitest/ESLint/compiler | Tackalay + IvanRamirezFrancisco | CI | JUnit/cobertura; depende de implementar HU | PLANIFICADO: detalle/favoritos pendientes; análisis estático transversal implementado |
| HU-07–08,01 | Producto; Favoritos; Autenticación | XP3 | PRUEBAS DE INTEGRACIÓN y seguridad de IDs/aislamiento | Comprobar contratos y propagación entre componentes | Postman/TestBed | IvanRamirezFrancisco + Tackalay | Integration/Security | PF/PS, cuentas A/B sintéticas | PENDIENTE: HU detalle/favoritos y aislamiento; contrato API independiente preparado |
| HU-01–08 | Autenticación; Inicio; Catálogo; Búsqueda; Producto; Favoritos | XP3 | PRUEBAS DE ACEPTACIÓN y PRUEBAS DE REGRESIÓN | Comprobar recorridos de usuario y detectar regresiones | Maestro/Vitest | Tackalay | Acceptance/Regression | Recorridos ampliados y JUnit | PARCIAL: flujos demo, backend pendiente |
| HU-09–11 | Carrito; Checkout | XP4 | PRUEBAS UNITARIAS y ANÁLISIS DE CÓDIGO ESTÁTICO de cantidades/totales | Verificar lógica, tipos, plantillas y cobertura | Vitest/ESLint/compiler | Tackalay + IvanRamirezFrancisco | CI | Cobertura crítica y JUnit | PARCIAL: pruebas del código actual; HU completa y casos backend pendientes |
| HU-09–11 | Carrito; Checkout | XP4 | PRUEBAS DE INTEGRACIÓN de stock/precio/checkout/idempotencia | Comprobar contratos y propagación entre componentes | Postman/TestBed | IvanRamirezFrancisco API; Tackalay | Integration | Contrato/fixtures; checkout bloqueado por endpoint ausente | PARCIAL: frontend demo; API pendiente |
| HU-01–11 | Autenticación; Inicio; Catálogo; Búsqueda; Producto; Favoritos; Carrito; Checkout | XP4 | PRUEBAS DE ACEPTACIÓN y PRUEBAS DE REGRESIÓN compra | Comprobar recorridos de usuario y detectar regresiones | Maestro/Vitest | Tackalay | Acceptance/Regression | APK/JUnit/PF/PS; no confundir demo con compra | PARCIAL: flujos demo, backend pendiente |
| HU-04–06 agrupadas | Inicio; Catálogo; Búsqueda | XP4 | PRUEBAS DE RENDIMIENTO y PRUEBAS DE ESFUERZO / ESTRÉS con recuperación | Medir latencia, errores y recuperación sin afectar producción | k6 | IvanRamirezFrancisco ejecuta; Tackalay analiza | Performance manual | p90/p95/error/requests por fase | PENDIENTE: ambiente autorizado |
| HU-12–14 | Pedidos; Perfil | XP5 | PRUEBAS UNITARIAS y ANÁLISIS DE CÓDIGO ESTÁTICO pedidos/perfil | Verificar lógica, tipos, plantillas y cobertura | Vitest/ESLint/compiler | Tackalay + IvanRamirezFrancisco | CI | JUnit/cobertura | PARCIAL: pruebas del código actual; HU completa y casos backend pendientes |
| HU-11–14 | Checkout; Pedidos; Perfil | XP5 | PRUEBAS DE INTEGRACIÓN y aislamiento entre usuarios | Comprobar contratos y propagación entre componentes | Postman/TestBed | IvanRamirezFrancisco + Tackalay | Integration | PF/PS y contrato final (pedidos propios pendiente) | PARCIAL: frontend demo; API pendiente |
| HU-01–14 | Autenticación; Inicio; Catálogo; Búsqueda; Producto; Favoritos; Carrito; Checkout; Pedidos; Perfil | XP5 | PRUEBAS DE ACEPTACIÓN y PRUEBAS DE REGRESIÓN integral | Comprobar recorridos de usuario y detectar regresiones | Maestro/Vitest | Tackalay | Acceptance/Regression | Evidencia de cada HU, brechas identificadas | PARCIAL: flujos demo, backend pendiente |
| HU-04–06; ampliar a 09–14 solo tras contrato/permiso | Inicio; Catálogo; Búsqueda; Carrito; Checkout; Pedidos; Perfil (ampliación condicionada) | XP5 | PRUEBAS DE RENDIMIENTO y PRUEBAS DE ESFUERZO / ESTRÉS comparativas | Medir latencia, errores y recuperación sin afectar producción | k6 | IvanRamirezFrancisco + Tackalay | Performance manual | Comparación con baseline; no endpoint inventado | PENDIENTE: ambiente autorizado |
| HU-01–14 | Autenticación; Inicio; Catálogo; Búsqueda; Producto; Favoritos; Carrito; Checkout; Pedidos; Perfil | CIERRE | REEJECUCIÓN DE LOS SIETE TIPOS DE PRUEBA aplicables y revisión de pendientes | Consolidar evidencia de los siete tipos y defectos restantes | Herramientas anteriores | Ambos | CI/Security/Integration/Regression/Performance | Índice de SHA/runs/artifacts, PV y defectos abiertos | PLANIFICADO |

## Tareas y responsables existentes

TT-42 (#61), TT-44 (#63), TT-48 (#67), TT-49 (#68), TT-50 (#69): Tackalay. TT-43 (#62), TT-45 (#64), TT-46 (#65), TT-47 (#66): IvanRamirezFrancisco. Conservar asignación. Esta ampliación de pruebas se referencia en esas tareas; no crea duplicados ni marca terminación.

El calendario es un plan de ejecución/reejecución, no prueba de cumplimiento. Adelantar pruebas de UI demo no adelanta formalmente las HU. Cada evidencia debe indicar fecha real; requisitos remotos bloqueados se registran y reprograman explícitamente, no se dan por aprobados.
