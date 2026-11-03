# Etapa 1B — consolidación y publicación del incremento móvil

Fecha: **3 de noviembre de 2026**, America/Mexico_City. Este informe corresponde a la consolidación del trabajo local de octubre. No agrega funcionalidades de producto. El registro de publicación y CI se completa en [PUBLICATION.json](PUBLICATION.json) después de publicar el Draft PR.

## Respaldo y punto de partida

Respaldo manual existente: `C:/Users/ivanf/CMC_BK/mobile`, sin modificaciones. Se comprobaron `.git`, `src`, `test` y `docs`. La comparación SHA-256 inicial de **468 archivos** versionados o candidatos a versionar, incluidos los nuevos, no encontró faltantes ni diferencias. También coincidieron `.git/HEAD`, configuración, índice y referencias, y el archivo local ignorado `android/local.properties`. `git fsck --connectivity-only --no-reflogs` en modo de lectura terminó con código 0; los avisos de objetos dangling no son objetos perdidos. No se regeneró el respaldo.

Rama inicial y de publicación: `feature/actividad-4-integracion-movil`. SHA inicial: `efe9767082040971278e66595aad8c0bf82c4b81`. Sin upstream inicial. Árbol inicial: **67 modificados + 218 nuevos = 285 rutas**, sin staged ni eliminados. `main` y `develop` locales y remotos no se modifican.

## Selección y commits

Se usaron listas explícitas de rutas, revisión de `git diff --cached`, escaneo de credenciales y comprobación de formato antes de cada commit. No se agregaron directorios indiscriminadamente. La autoría configurada corresponde a IvanRamirezFrancisco; no se inventaron coautorías y el historial previo se conserva.

| Commit | Finalidad | Archivos |
|---|---|---:|
| `1c5fdbe` | Entornos Angular conectado/DEMO, Capacitor, workflows Android y exclusiones | 8 |
| `69fd14f` | Contratos/modelos, validadores, repositorios, sesión, servicios y pruebas del núcleo | 83 |
| `6ac78a0` | Componentes compartidos, controles, estilos y pruebas de UI | 12 |
| `9145ddf` | Módulos móviles, navegación pública/protegida y pruebas de integración | 79 |
| `d03d0a5` | Ejecutores y matriz de caja blanca, utilidades de evidencia y Maestro | 14 |
| Commit documental que contiene este informe | Documentación, capturas y evidencias históricas, validación y trazabilidad de Etapa 1B | Inventario del PR |

Los contratos del núcleo preceden a componentes y vistas; las pruebas de cada módulo se conservan junto a su implementación. El commit de herramientas no duplica especificaciones. La relación exacta por ruta y hashes inicial/final está en [INVENTORY.json](INVENTORY.json).

Se conservaron las **285 rutas iniciales**. Sólo cuatro archivos fuente/prueba recibieron normalización de finales de línea o eliminación de líneas vacías al final, necesaria para `git diff --cached --check`. Su contenido sin espacios en blanco se comparó con el respaldo y permanece idéntico. No cambió lógica, aserciones, umbrales ni scripts para adaptar comandos. La documentación histórica recibió avisos de fecha y se omitieron referencias de nombres de ramas no necesarias para publicación; sus originales permanecen en el respaldo.

Clasificación inicial: 83 archivos de núcleo y sus pruebas; 79 de módulos y sus pruebas; 12 de UI compartida; 5 de configuración; 3 de DevOps/exclusiones; 14 de herramientas/flujo de pruebas; 15 documentos y 74 evidencias. No había cambios pendientes en archivos Android nativos; se valida su configuración existente. Las categorías separan producto, modelos/servicios/repositorios, configuración, Android, pruebas, DevOps, documentación, evidencias y archivos generados/sensibles.

**Excluidos:** dependencias, `node_modules`, `dist`, `www`, `.angular`, `coverage`, `reports`, Gradle/build, assets copiados por Capacitor, configuración local SDK, APK/AAB, ZIP, bases temporales, claves de firma, variables de entorno privadas y respaldos. Se conservan únicamente capturas, manifiestos y resúmenes/JUnit históricos sanitizados como evidencia documental; no se incluyen los directorios de cobertura o reportes de ejecución. El APK nuevo permanece local.

El escaneo de candidatos y del índice no encontró claves privadas, tokens de proveedor ni credenciales reales. Las coincidencias revisadas son contraseñas/tokens ficticios usados exclusivamente con `HttpTestingController`, JWT sintéticos sin firma válida y una URL del dominio reservado `.test` que verifica rechazo de credenciales incrustadas. No son accesos a servicios reales. Las capturas de formularios conservadas no contienen credenciales ingresadas.

## Validación ejecutada en Etapa 1B

Se verificaron scripts reales de `package.json`, configuraciones Angular `ci`, `integration`, `regression`, `production` y el archivo serial antes de ejecutar. Los logs completos permanecen en `reports/etapa1b/`, ignorados. [VALIDATION.json](VALIDATION.json) conserva comandos, códigos, duración, hashes, cobertura y límites.

| Validación | Resultado nuevo |
|---|---|
| `npm run lint` | Aprobado |
| `npm run test:white-box` | **122 aprobadas**, 10 archivos, 0 fallidas |
| `npm run test:coverage -- --runner-config=test/vitest.serial.config.mjs` | **587 aprobadas**, 65 archivos, 0 fallidas |
| `npm run test:integration -- --runner-config=test/vitest.serial.config.mjs` | **168 aprobadas**, 12 archivos, 0 fallidas |
| `npm run test:regression -- --runner-config=test/vitest.serial.config.mjs` | **154 aprobadas**, 29 archivos, 0 fallidas |
| `npm run build -- --configuration=production` | Aprobado; 9 avisos de presupuesto CSS |
| `npx cap sync android` | Aprobado; 4 plugins |
| `gradlew.bat assembleDebug`, desde `android` | **BUILD SUCCESSFUL**, 213 tareas: 27 ejecutadas y 186 actualizadas |
| `git diff --check` y `git diff --check efe9767` | Aprobados |

Cobertura: **95.83 % instrucciones, 93.86 % ramas, 94.07 % funciones y 97.89 % líneas**. No se redujeron umbrales ni se desactivaron controles. No hubo cambios de fuentes/configuración durante la validación.

Las suites especializadas seleccionan casos de la general. Se contrastaron los nombres de casos de los JUnit de integración y regresión con el general: son subconjuntos. Caja blanca selecciona diez especificaciones originales. **Total de casos únicos ejecutados: 587; no sumar 122 + 168 + 154.** Integración incluye router/UI y respuestas HTTP controladas: no acredita PostgreSQL, login/MFA, persistencia, autorización ni compras reales.

Advertencias: nueve presupuestos CSS exceden el umbral de aviso, dentro del límite de error; dos avisos Gradle `flatDir`; herramientas SDK que entienden XML 3 encontraron XML 4. Ninguno impidió el build. Se documentan sin alterar presupuestos, SDK o dependencias.

APK Debug nuevo: `android/app/build/outputs/apk/debug/app-debug.apk`, **7,843,033 bytes**. SHA-256: `8fba9e7b46b1f405c12814da2d6c0eed38302afcae7616d27bf94fa67312ae2c`. Contiene assets Angular production. En esta etapa se compiló; no se reinstaló ni se repitieron recorridos de emulador/dispositivo. No se ejecutaron Release ni Google Play.

Las capturas, APK instalado y recorridos del 29 de octubre siguen siendo antecedentes. Los manifiestos de octubre identifican versiones históricas; sus hashes documentales no se sustituyen por resultados nuevos. `test/verify-evidence.mjs` consulta ese manifiesto histórico y no certifica el APK actual ni los cuatro archivos normalizados. Para esta etapa corresponden los hashes de [VALIDATION.json](VALIDATION.json) y el inventario de publicación.

## Revisión colaborativa y solapamientos

El Draft PR se dirige exclusivamente a `develop`. La instrucción de Etapa 1B permite publicarlo con solapamientos documentados; las decisiones de bloqueo de los informes de octubre son históricas. No se aplicaron patches ni se modificaron ramas o PR de Brayan.

| PR abierto de Brayan | Coincidencia | Conciliación posterior |
|---|---|---|
| [#71 — registro y catálogo](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/pull/71) | `app.routes.ts`, `angular.json`; equivalencia funcional entre pantallas legacy de registro/catálogo y módulos actuales | Revisar rutas, validadores y pruebas; preservar contribuciones y autoría. GitHub lo informó con conflictos respecto a su base al consultarlo. |
| [#77 — recuperación](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/pull/77) | `forgot-password.page.html` y `.ts`; correo, confirmación neutral, errores/reintentos | Conciliar validaciones DEMO con vista conectada y estilos. GitHub lo informó mergeable al consultarlo; el fallo histórico de aplicación directa de patch no equivale a conflicto de merge. |
| [#80 — perfil](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/pull/80) | `edit-profile.page.html` y `.ts`; validación/normalización DEMO frente al bloqueo honesto de edición conectada | Preservar sus validadores/pruebas y acordar contrato de edición. GitHub lo informó con conflictos al consultarlo. |

[OVERLAPS.json](OVERLAPS.json) registra los HEAD consultados y la observación de GitHub. La mergeabilidad es temporal y no representa una simulación de aplicar estos tres PR entre sí. Permanecen abiertos, sin aprobación, cierre ni merge por esta intervención.

## GitHub Projects y aceptación

Project existente: [Casa de Música Castillo — App Móvil](https://github.com/users/IvanRamirezFrancisco/projects/1). Se consultaron **69 tarjetas y 19 campos**, incluidos responsables, Story Points, estados, Iteración XP y Etapa DevOps. [PROJECT_TRACEABILITY.json](PROJECT_TRACEABILITY.json) enlaza los commits de producto/herramientas y evidencias con las HU/TT/PV existentes.

Se conservan las 69 tarjetas, sus responsables, estados, iteraciones y estimaciones. Ninguna HU/TT/PV pasa a Done por esta intervención. Se agrega el Draft PR al mismo Project como entrega verificable **En pruebas / TEST**; no se asigna una única iteración a un incremento que abarca varias ni se duplican Story Points de las HU. La confirmación del alta y las invariantes posteriores se registra en `PUBLICATION.json`.

Las HU-01 a HU-14 conservan aceptación pendiente. TT-05 (#19) sigue En proceso y sin persistencia segura; TT-06 (#20) conserva su estado hasta validar el manejo global de errores. TT-03/#17 y TT-04/#18 mantienen sus estados históricos, sin reinterpretarlos como aceptación de todos los módulos. No se crean Issues, no se editan criterios ni se cierran tareas de otros integrantes.

## Límites y próxima acción

Pendientes de Etapa 2: conciliación conjunta de #71/#77/#80; cuenta y buzón sintéticos autorizados; BD aislada; login/MFA y autorización/persistencia reales; almacenamiento seguro TT-05; contrato de edición de perfil; captura sanitizada de la respuesta real de cotización incompatible; revisión visual pendiente de tableta/horizontal, TalkBack y dispositivo físico.

**Próxima acción concreta:** revisar en conjunto el Draft PR y acordar la matriz de conciliación de registro/catálogo, recuperación y perfil con los HEAD de #71/#77/#80. Después preparar la cuenta/BD aisladas y ejecutar sus criterios de aceptación antes de cambiar estados. No habilitar confirmación de compras, realizar merges, desplegar ni iniciar Android Release en esta etapa.
