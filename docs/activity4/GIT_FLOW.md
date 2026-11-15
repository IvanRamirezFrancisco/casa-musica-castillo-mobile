# Revisión de publicación y trazabilidad

> Documento histórico de octubre. Las referencias de ramas históricas se omiten para publicación; los originales permanecen en el respaldo manual. El estado y las validaciones de Etapa 1B están en [el informe actual](../etapa1b/README.md).


Fecha: 29/octubre/2026. Rama `feature/actividad-4-integracion-movil`; HEAD y `develop` remoto consultado: `efe9767082040971278e66595aad8c0bf82c4b81`. La rama de trabajo no existía aún en remoto en esa consulta. No se cambia de rama ni se modifica la base.

## Preservación y clasificación

Se respaldaron **237 rutas con cambios anteriores** en `reports/activity4-close/before.zip`, con inventario SHA-256 `before.json`, antes de editar. Permanecen en disco; el manifiesto final distingue intactas/cambiadas/nuevas y verifica que ninguna falta. La procedencia de todos los cambios heredados no puede deducirse de Git mientras están sin commit: no se inventan coautorías ni se atribuyen commits nuevos a otros integrantes sin evidencia.

La clasificación exacta por ruta aparece en `VALIDATION.json`:

- Producto: `src/app`, estilos, entornos, configuración Angular/Capacitor.
- Pruebas: especificaciones junto al código, setup, ejecutores `/test` y flujos Maestro DEMO heredados.
- Evidencias: `docs/testing`, `docs/activity4` y matrices; las imágenes se identifican por hash.
- CI: modificaciones heredadas a acceptance/android-build; no fueron reescritas en este cierre.
- Excluidos: `reports/`, ZIP de preservación, logs, coverage generado, `www/`, node_modules, Maven/Gradle/cache, APK/AAB, bases temporales y secretos de entorno. Se amplía `.gitignore` sin borrar archivos. El APK se conserva localmente con hash y comandos de reproducción.

No se usa `git add .` ni `git add -A`. No se modifican stashes, historial, main/develop ni ramas de PR ajenos.

## Solapamientos comprobados — publicación bloqueada

PR abiertos consultados, autor **Tackalay (Brayan Lara)**, destino `develop`:

| PR | Archivos solapados / resultado en seco | Revisión necesaria |
|---|---|---|
| [#80 · validación de perfil](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/pull/80) | `edit-profile.page.html`, `.ts`, `.spec.ts`: patch no aplica al árbol actual | Conservar sus validadores y pruebas DEMO al incorporar el bloqueo de edición conectada y navegación Ionic |
| [#77 · recuperación](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/pull/77) | `forgot-password.page.html`, `.ts`: patch no aplica | Conciliar sus validaciones/estados con la vista conectada y UI actuales, sin reemplazar su rama |
| [#71 · registro/catálogo](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/pull/71) | `app.routes.ts`: patch no aplica; también cambia `angular.json` | Revisar convivencia de rutas/componentes legacy y módulos actuales, manteniendo autores y pruebas |

Se descargaron patches con `gh pr diff N --color never` y se ejecutó `git apply --check reports/activity4-close/prN.patch`. **No se aplicaron**. El resultado demuestra incompatibilidad de aplicación directa; no equivale a una resolución de merge de tres vías ni declara el estado de mergeabilidad que GitHub no se consultó. Logs y patches permanecen locales. `PUBLICATION_REVIEW.json` conserva diagnóstico sanitizado.

El cierre no modifica los `.ts` o specs de Editar perfil afectados por #80; sólo la explicación del modo conectado en su HTML y una prueba de integración conectada. No se cambia recuperación/registro en este cierre. No se incorpora ni reinterpreta su código pendiente por cuenta propia.

TT-05 ([#19](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/issues/19)) permanece abierto. No se modifica `MemorySessionStore`, token SESSION_STORE ni la implementación de almacenamiento de otro integrante. No se introduce persistencia alternativa.

**Decisión:** no crear commits ni publicar el conjunto hasta revisar estas superposiciones y la procedencia del árbol heredado. Es la condición de parada de publicación indicada por el usuario, no un error menor de estilo. No se solicita merge ni se envían mensajes a colaboradores.

## Propuesta de commits posterior a la revisión

No son commits existentes; requieren resolver el árbol completo y comprobar sus dependencias antes de separar los cambios:

1. `feat(catalog): integrate public catalog and mobile product experience` — contratos/validadores/adaptadores, catálogo público y UI relacionada; HU-04/05/06/07, TT-03/04/06.
2. `feat(account): integrate guarded account and commerce views` — autenticación, favoritos, carrito/pedidos/perfil, límites de escritura y pruebas; HU-01/02/03/08–14. Revisar primero #71/#77/#80 y TT-05.
3. `fix(checkout): cancel stale quotes and validate checkout input` — estado por vista y pruebas nuevas, dependiente de contratos/base anterior.
4. `docs(activity4): document architecture and reproducible evidence` — `/test`, matrices, capturas y manifiesto, más configuración necesaria de pruebas/Android revisada. No incluir backups, logs o APK binario.

Separar las mejoras visuales si el diff revisado lo permite; no fabricar una secuencia que compile sólo al final. El manifiesto relaciona fuentes con pruebas aunque no haya un commit del incremento.

## Draft PR preparado conceptualmente

Base `develop`, head `feature/actividad-4-integracion-movil`; título propuesto: **Integrate mobile public catalog and stabilize account interfaces**. Descripción: navegación pública y catálogo real, UI móvil consistente, estado de cotización sin respuestas obsoletas, operaciones comerciales bloqueadas, arquitectura y pruebas reproducibles. Relacionar HU/TT mediante `Refs`, sin `Closes` para funcionalidades no aceptadas. Incluir 587/168/154 casos y cobertura del manifiesto, límites de HTTP simulado y cuenta pendiente; adjuntar capturas sanitizadas y hash del APK.

Antes de publicar: resolver solapamientos con el equipo; revisar selección de archivos y secretos; confirmar branch/base; ejecutar checks sobre fuentes finales; crear commits con autoría correcta. Después: push normal de esta rama y Draft PR, consultar Actions de su HEAD, adjuntar el PR al chat y registrar estados reales. No habilitar auto-merge, no merge ni deploy.

## CI y GitHub Project

**Commits nuevos: ninguno. Draft PR: no creado. CI del incremento: no ejecutado.** Los checks de commits anteriores no validan estas fuentes sin commit.

`TRACEABILITY.json` conserva nombres, responsables y estados de Issues consultados. La correspondencia funcional se detalla en el índice y la tabla siguiente. No se modifican GitHub Project, Issues o responsables ni se marca Done. No se deducen campos personalizados de Status/Iteración XP/Etapa DevOps a partir de `state=OPEN/CLOSED`.

| HU | Evidencia de incremento actual | Aceptación pendiente |
|---|---|---|
| HU-01 | Login UI, JWT, guards/retorno; tests de sesión | Login/MFA real, TT-05 |
| HU-02 | Registro visible en Android, validaciones HTTP controladas | Cuenta/buzón de prueba; revisión #71 |
| HU-03 | Recuperación/reset UI y pruebas | Correo real autorizado; conciliación #77 |
| HU-04 | Inicio público real y capturas | Revisión editorial del catálogo |
| HU-05 | Catálogo paginado, filtros y API real | Revisión del alcance legacy de #71 |
| HU-06 | Búsqueda real con parámetros y cancelación | Aceptación de UX por el equipo |
| HU-07 | Detalle real, precio/stock, opiniones públicas | Multiimagen real y acciones autenticadas |
| HU-08 | GET/POST/DELETE favoritos controlados; guard real | Persistencia/autorización reales |
| HU-09 | Cantidad y revalidación antes del carrito, tests | Alta real aislada |
| HU-10 | Reglas de partidas/stock/totales, tests | Mutaciones reales aisladas |
| HU-11 | Cotización sin carreras, validación y compra bloqueada | JSON de error real, cuenta/BD aislada y autorización |
| HU-12 | Lista/estado/paginación con HTTP controlado | Propiedad real de usuario |
| HU-13 | Detalle/timeline con HTTP controlado | Cuenta propia/ajena sintéticas |
| HU-14 | Perfil controlado, edición conectada honesta | Contrato de edición y conciliación #80 |
| TT-03 / #17 | Adaptadores API y GET públicos reales | Está cerrado en GitHub; no equivale a aceptación de todos los módulos |
| TT-04 / #18 | Inicio, tabs y rutas protegidas | Está cerrado; revisión visual/privada adicional descrita |
| TT-05 / #19 | Se preserva sesión volátil y límites | Abierto, almacenamiento seguro separado |
| TT-06 / #20 | Errores visibles, validadores y reintento | Abierto; aceptación global pendiente |
