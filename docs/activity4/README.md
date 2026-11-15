# Actividad 4 — entrega técnica para revisión

> Documento histórico del 29 de octubre. Las cifras y decisiones de publicación describen esa ejecución. La Etapa 1B del 3 de noviembre permite publicar el Draft PR con solapamientos documentados: consultar [el informe actual](../etapa1b/README.md).


**29/octubre/2026 · America/Mexico_City. Estado: parcial, validación local; publicación bloqueada por solapamientos de equipo.**

Proyecto: [Casa de Música Castillo Mobile](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile). Rama `feature/actividad-4-integracion-movil`, base `efe9767082040971278e66595aad8c0bf82c4b81` de `develop`. El HEAD identifica la base, **no contiene el árbol sin commit**; `VALIDATION.json` identifica las fuentes probadas y artefactos. No presentar un check del SHA base como resultado del incremento.

## A. Proyecto, alcance y stack

Se conserva Ionic 9, Angular standalone 22.2, Capacitor 8.5, RxJS, TypeScript, Android target 36 y API Spring Boot/PostgreSQL. No se reconstruye la app. Catálogo público real, pantallas privadas conectadas con validación HTTP controlada; compras reales bloqueadas. No se alteran backend, producción, pagos o stock.

## B–C. Arquitectura y patrones

[Arquitectura, clases, diagrama y explicación de los cuatro patrones](ARCHITECTURE.md). Repository para contratos/adaptadores, Singleton mediante DI root, Observer mediante RxJS/Signals y Simple Factory de pedidos **DEMO** con invariantes. Se extrae estado de cotización por vista para corregir una carrera real; esto demuestra separación de View/estado/Model en ese recorrido. No se proclama Clean/MVVM estrictos en toda la aplicación ni aceptación docente de Ionic frente a una lista cerrada Flutter/React Native/Kotlin.

## D–E. Caja blanca y cobertura

Selección ejecutable: `npm run test:white-box`, desde `/test/run-white-box.mjs`. [Matriz CB-01 a CB-25](../../test/WHITE_BOX_MATRIX.md): validaciones, ramas, límites, excepciones, carrito, Factory, Repository, sesión, errores y guardias. Selecciona especificaciones originales sin duplicarlas.

| Validación actual | Resultado |
|---|---|
| Suite completa / cobertura | 587 aprobadas, 65 archivos |
| Integración HTTP controlada | 168 aprobadas |
| Regresión | 154 aprobadas |
| Selección de caja blanca | 122 aprobadas, 10 archivos |
| Instrucciones / ramas / funciones / líneas | 95.83% / 93.86% / 94.07% / 97.89% |
| Lint | Aprobado |
| Angular production / development | Aprobados |
| Capacitor sync / Gradle Debug / manifiesto Release | Aprobados |

Las selecciones se solapan: **no sumar sus cantidades a 587**. Respecto a las 575 pruebas anteriores se agregan 12, sin eliminar casos/aserciones ni modificar umbrales. Las cuatro métricas aumentan respecto a 95.79/93.79/93.99/97.87%. Nueve avisos de presupuesto CSS permanecen, sin errores de build; no se ocultan ni aumentan los límites.

Los logs completos están en `reports/activity4-close/` (local, ignorado por Git). `VALIDATION.json` conserva resultados, hashes y cobertura resumidos. La primera ejecución restringida de caja blanca falló por permiso temporal EPERM, antes de ejecutar casos; se repitió fuera del sandbox y pasó. No fue una prueba de negocio aprobada ni se ocultaron casos.

Se conservan JUnit y resumen de cobertura en `results/` como resultados de prueba, sin ZIP, logs de consola o caches. `node test/verify-evidence.mjs` comprueba que fuentes y capturas sigan correspondiendo al manifiesto; no sustituye volver a ejecutar las pruebas.

## F–H. Android, navegación y artefacto

Se compila, sincroniza, instala con `adb install -r` y abre **el APK nuevo**, no la instalación anterior. Ruta local: `android/app/build/outputs/apk/debug/app-debug.apk`; copia de entrega en `docs/activity4/artifacts/app-debug.apk` (ignorada por Git). SHA-256, coincidencia con APK instalado, versión, dispositivo y resultados en `VALIDATION.json` y `ANDROID.md`.

El recorrido automatizado usa ADB nativo y observación de WebView Debug, no Maestro. `https://localhost` es origen de Capacitor; API del emulador `http://10.0.2.2:8080`, Windows `127.0.0.1:8080`, producción HTTPS separada. No existe fallback automático. La excepción HTTP se mantiene sólo en Debug y para el host del emulador; Release no se ejecuta en esta entrega.

Capturas actuales: `android/`. Capturas históricas en `../testing/commerce-ui/` se conservan con sus hashes previos, vinculadas al APK anterior del informe COMMERCE, **sin atribuirlas al nuevo binario**. El resultado de cada recorrido nuevo y sus limitaciones se detalla en [ANDROID.md](ANDROID.md).

## Correcciones finales de Checkout y Editar perfil

**Checkout:** `PricePreviewResponse` y `OrderController` del backend consultado devuelven el objeto con importes numéricos `subtotal/tax/shipping/total`, entrega y banderas booleanas. Coinciden con el parser móvil; no se inventan campos ni se relaja la validación para aceptar JSON incompatible. La rama backend leída tiene trabajo de otro proceso y no se acredita como versión del binario ejecutado.

El mensaje «respondió de forma inesperada» corresponde a `ApiError.kind='invalid-response'`; puede originarse al validar carrito o cotización. Se distingue de conexión, 401, 403 y 5xx. **No se conoce el cuerpo real que lo provocó**: no hay cuenta sintética ni BD aislada autorizadas. Para resolverlo definitivamente hace falta capturar únicamente status, tipo y claves del JSON de `/api/cart` y `/api/checkout/price-preview` en ese entorno, sin JWT ni datos personales. No se envió ese POST: el backend puede crear carrito incluso al cotizar.

Defectos frontend confirmados y corregidos: cambio de entrega durante una petición descartado por el antiguo guard de loading; importes antiguos conservados al editar destino; datos de longitud inválida podían llegar al paso de confirmación en la configuración de prueba. `CheckoutQuoteStateService` cancela solicitudes obsoletas, invalida cotización al cambiar entrega/destino/sesión y finaliza al destruir la vista. La vista revisa formulario inválido antes de validar/confirmar. Se retiran endpoints REST del aviso de seguridad y se mantienen bloqueos tanto de vista como de repositorio.

**Editar perfil:** el modo conectado muestra una explicación breve, sin endpoints ni formulario ficticio. Volver al perfil conserva navegación. `save()` sigue sin escribir ni modificar la cuenta DEMO en modo conectado. No se fabrica un PUT de autoservicio. El formulario DEMO se conserva; no se incorpora ni reemplaza la validación pendiente del PR #80.

## I–K. Git Flow, commits, Draft PR y CI

**Publicación detenida por un bloqueo comprobado**, conforme a la condición de esta ejecución: los patches de PR abiertos de Brayan #71, #77 y #80 no aplican limpiamente al árbol actual en comprobación `git apply --check`, sin aplicarlos. [Detalle y clasificación](GIT_FLOW.md).

Estado local del cierre: **67 archivos tracked modificados y 218 untracked**, nada staged ni eliminado. Se conservan las 237 rutas heredadas: 233 mantienen su hash y cuatro reciben correcciones incrementales (Checkout, su integración, integración de perfil y el HTML de Editar perfil). `.gitignore`, scripts y documentación se identifican por separado en el manifiesto; no se atribuye todo el árbol a este cierre. `git diff --check` termina con código 0 y el escaneo de firmas seleccionadas de credenciales no encuentra candidatos, sin certificar ausencia absoluta de secretos.

No se crean commits, push o Draft PR, para no presentar una integración que pise aportaciones pendientes ni atribuir a una sola persona todo el trabajo heredado. No hay ejecuciones GitHub Actions del incremento: «no ejecutado», no PASS. No hay merge, auto-merge ni deploy. Se deja propuesta de commits/PR y revisión requerida; no se publica parcialmente un árbol cuyas fuentes conectadas todavía están sin seguimiento.

## L. Límites y siguiente incremento

- Cuenta sintética, buzón, factores MFA y confirmación de BD aislada: pendientes. Login, MFA, favoritos, carrito, perfil y pedidos reales no se acreditan por mocks.
- TT-05: almacenamiento seguro de sesión sigue abierto; se conserva memoria volátil y no se añade localStorage ni una solución paralela.
- Contrato de edición de perfil, enlaces móviles de verificación, selector público de marcas y revisión editorial del catálogo: pendientes del backend/producto.
- TalkBack, teclado completo y teléfono físico: pendientes; no se certifica WCAG 2.2 AA completa.
- La repetición de tableta/horizontal del APK de cierre queda parcial por incidente System UI/timeout del emulador; se conserva evidencia y el script de reejecución, sin declarar PASS global.
- El backend consultado devuelve mensajes de excepción en algunos 400 de Checkout: revisar su sanitización antes de producción. El cliente distingue clases de error, pero no se afirma eliminación absoluta de datos internos en todos los mensajes de negocio.
- Resolver solapamientos con Brayan, revisar autoría/procedencia del árbol heredado y después publicar para obtener CI del SHA real.

## Matriz de cumplimiento — siete puntos solicitados

Pesos tomados de los criterios facilitados por el usuario; no es una calificación asignada por el docente.

| Criterio | Peso máximo | Estado | Evidencia comprobable | Brecha para aceptación |
|---|---:|---|---|---|
| Interfaces | 2 | Parcial | UI pública conectada, capturas APK, formularios y flujos privados con HTTP controlado | Recorridos privados reales con cuenta/BD de prueba |
| Arquitectura y patrones | 2 | Parcial | `ARCHITECTURE.md`, clases y cuatro patrones con utilidad/pruebas; extracción de estado de cotización | Clean/MVVM no estrictos en toda la app; confirmar aceptación de stack/alcance |
| Pruebas de caja blanca | 1.5 | Cumple técnicamente; interpretación docente pendiente | 587 pruebas, cobertura real, `/test` ejecutable y matriz de ramas/aserciones | Confirmar si exige ubicación física de cada spec en `/test` |
| Navegación y UX/UI | 1.5 | Parcial | Inicio invitado, cinco tabs, guards, retorno seguro, APK y matriz responsiva | Validación privada, teclado/TalkBack/teléfono físico |
| Total evaluable | **7** | **Entrega parcial honesta** | Sin convertir mocks o builds en evidencia de integración real | Validación docente y bloqueos anteriores |

## Cómo presentar

1. Abrir este índice y mostrar diagrama/patrones con sus rutas de código.
2. Ejecutar `npm run test:white-box`; enseñar matriz y cobertura HTML generada por `npm run test:coverage -- --runner-config=test/vitest.serial.config.mjs`.
3. Instalar el APK cuyo hash aparece en el manifiesto; demostrar Inicio, categorías, filtros, búsqueda, detalle y login de invitado. Mantener backend local disponible.
4. Mostrar capturas/registro Android y distinguir los guards de la ejecución privada autenticada.
5. Explicar límites del checkout y edición; no registrar, cotizar con cuenta real ni confirmar pedidos como demostración.
6. Presentar trazabilidad HU/TT sin marcar Done. Mostrar bloqueo Git y propuesta de revisión antes de cualquier publicación.

Referencias históricas: [COMMERCE_UI_REDESIGN](../testing/COMMERCE_UI_REDESIGN.md), [MOBILE_INTEGRATION_EVIDENCE](../testing/MOBILE_INTEGRATION_EVIDENCE.md). Sus cifras corresponden a incrementos anteriores; prevalece este cierre con su manifiesto.
