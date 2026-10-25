# TT-03 — Conexión REST

## Contrato verificado en el backend

Repositorio local `segundo proyecto`, rama `feature/mobile-api-support`:

- `PublicCategoryController`: `GET /api/public/categories/active`, parámetro opcional `withProducts=false`.
- `SecurityConfig`: GET `/api/public/**` es público; `JwtAuthenticationFilter` omite estas rutas. No requiere sesión.
- Respuesta HTTP 200: array JSON de `PublicCategoryDTO`, sin envoltorio ni paginación:
  `id: number`, `name: string`, `description: string|null`, `imageUrl: string|null`,
  `parentId: number|null`, `parentName: string|null`, `activeProductCount: number`.
  Una lista vacía es válida. Los campos anulables se comprobaron contra `Category` y su mapeo en `PublicCategoryService`.
- Atención: aunque el DTO llama al campo `activeProductCount`, la fórmula actual de `Category.productCount` cuenta todos los productos. TT-03 conserva el contrato y no cambia esa lógica.
- Productos también existen en `PublicProductController`: raíz, `/catalog` (Page de `PublicProductDTO`), `/latest`, `/featured`, `/{id}` y recomendaciones/tendencias. No se implementa su consumo.
- `application-local.yml` fija 8080; `application.yml` usa `${PORT:8080}`. No se encontró context-path adicional. `application-production.yml` y Dockerfile usan `PORT`; Render termina TLS. Railway conserva configuración Docker, pero no se usa como destino móvil.
- Base pública facilitada por el propietario: `https://casa-musica-castillo-backend.onrender.com`.
  URL de prueba: `https://casa-musica-castillo-backend.onrender.com/api/public/categories/active`.
  La URL del despliegue no se dedujo del nombre del repositorio.

## Configuración e infraestructura

Se mantienen los environments existentes como única fuente de `apiBaseUrl`:

| Build | Navegador | Capacitor Android |
|---|---|---|
| development | `http://localhost:8080` | `http://10.0.2.2:8080` |
| production | Render HTTPS | Render HTTPS |

Si se cambia el puerto real del backend, actualizar únicamente el environment de desarrollo.
`npm run build` ya usa production por defecto y su reemplazo de environment en `angular.json`; no se cambió este archivo.
`npm start` usa development. Para servir Render: `npm start -- --configuration production`.

`provideHttpClient()` registra HTTP en el bootstrap standalone. `API_BASE_URL` permite inyección y sustitución en tests.
`ApiClientService` centraliza la unión de base/path, parámetros GET, timeout de 60 s y errores técnicos.
Las solicitudes públicas omiten credenciales. No hay reintentos automáticos.
`ApiConnectivityService.check()` realiza una única lectura por suscripción y valida el DTO en runtime.
La página `/api-connection` solo delega al servicio al pulsar el botón; no hace HTTP al iniciar la app.
Es un diagnóstico explícito, sin enlace en la navegación comercial. Salir cancela la solicitud pendiente.
HTTP 0 agrupa red, CORS, TLS y timeout: no puede identificar por sí solo la causa exacta.
Una respuesta 200 incompatible no se presenta como éxito. No se muestran cuerpos internos de errores.

## CORS

La fuente efectiva es `SecurityConfig.corsConfigurationSource()` → `cors.allowed-origins` → `CORS_ORIGINS`.
`WebMvcConfig` no añade otra lista; `AdvancedSecurityConfig` está en un perfil deshabilitado.
Se añadió **solo** `https://localhost` al default de desarrollo de `application.yml`.
Se mantienen `http://localhost:4200` y `http://localhost:4300`, métodos, headers, credenciales y reglas de seguridad existentes.
Si `CORS_ORIGINS` está definida, reemplaza todo el default: conservar los orígenes web existentes y añadir explícitamente los necesarios.

En Render, `application-production.yml` exige `CORS_ORIGINS` sin fallback. En Render → Environment, conservar la lista existente y asegurar `https://localhost` para la app empaquetada; añadir `http://localhost:4200` solo si se autoriza probar el navegador de desarrollo contra ese despliegue.
No se modificaron variables del despliegue desde esta tarea. No se usa `*`.
`10.0.2.2:8080` es destino, no origen: la app empaquetada sigue enviando `https://localhost`.
Si Ionic sirve en 8100, se debe autorizar ese origen exacto; las instrucciones siguientes usan 4200, que ya está permitido localmente.

## Prueba real, en orden

Precondición local: PostgreSQL y variables privadas del backend configuradas fuera del móvil. En el backend ejecutar `mvn spring-boot:run "-Dspring-boot.run.profiles=local"` (no tiene Maven Wrapper).
No copiar credenciales al móvil. Confirmar en el log que Spring inicia en 8080; una variable externa puede alterar la configuración efectiva.

1. **A — Local + navegador:** en móvil ejecutar `npm start -- --port 4200`; abrir `http://localhost:4200/api-connection`; pulsar **Probar conexión**. Esperar «Conexión correcta. Categorías recibidas: N». En Network comprobar GET a `http://localhost:8080/api/public/categories/active`, 200 y `Access-Control-Allow-Origin: http://localhost:4200`.
2. **B — Local + Pixel 8 API 36:** ejecutar `npm run build -- --configuration development`, `npx cap sync android`, `npx cap open android`. Seleccionar Pixel 8 API 36 y variante **debug**, ejecutar. Con Chrome `chrome://inspect/#devices`, inspeccionar la WebView y navegar a `https://localhost/api-connection`. Pulsar el botón. Network debe mostrar destino `http://10.0.2.2:8080` y origen `https://localhost`. Revisar firewall/servidor si no conecta. `localhost` dentro del emulador no es la PC. No se necesita `adb reverse`.
3. **C — Render + navegador:** detener el servidor Angular anterior, ejecutar `npm start -- --configuration production --port 4200`; abrir la misma ruta y pulsar. Confirmar destino Render, 200 y CORS del origen exacto. Si Render está suspendido, esperar su arranque y repetir manualmente si vence el timeout.
4. **D — Render + Pixel 8:** ejecutar `npm run build`, `npx cap sync android`; volver a ejecutar en Android Studio. Abrir la misma ruta mediante inspección remota y pulsar. Confirmar HTTPS Render, 200 y `Access-Control-Allow-Origin: https://localhost`.

No basta con abrir la URL del backend directamente: eso no demuestra CORS desde la WebView.
En cada caso registrar fecha, variante, URL, origen, status, cabecera CORS y resultado del botón. La suite unitaria no acredita estas cuatro pruebas reales.

### HTTP del emulador: excepción solo debug

El origen HTTPS de Capacitor bloquearía contenido mixto al consultar HTTP local y Android bloquea cleartext por defecto.
La variante debug añade un `network_security_config` que permite HTTP **únicamente** a `10.0.2.2`, con base denegada.
`MainActivity` habilita contenido mixto solo cuando la aplicación tiene `FLAG_DEBUGGABLE`.
Release conserva la política de Capacitor y no incluye el manifest ni XML de debug. No se habilitó cleartext global ni se cambió el esquema/origen de Capacitor.
Para producción usar siempre build Angular production y variante Android release; no empaquetar el environment de desarrollo en Play Store.
Tras cada cambio de build ejecutar `npx cap sync android` para evitar probar assets anteriores.

## Validación y alcance

`npm test -- --watch=false` usa `HttpTestingController` y dobles de servicio; no hace llamadas reales.
Los tests nuevos cubren URL/credenciales/timeout, errores, contrato real (incluidos nulos y lista vacía), ausencia de reintentos, activación manual y cancelación al salir.
El backend añade una regresión que carga el YAML real y verifica orígenes permitidos y rechazados.
Ejecutar también `git diff --check`, `npm run lint`, `npm run build` y, en backend, `mvn test`.

No se implementaron login, JWT, interceptor Authorization, almacenamiento de sesión, TT-05, manejo global de TT-06, catálogo TT-09, carrito, pagos ni cambios a los flujos demo. No se incorporaron secretos.

Resultado de ejecución (24 de octubre de 2026): lint y build móvil correctos; 170 tests móviles correctos (15 nuevos), 148 tests backend correctos (1 nuevo); `git diff --check` correcto en ambos repositorios. Android `assembleDebug --offline` correcto; manifest release generado y comprobado sin excepción de red debug. El bundle web de producción contiene Render y no contiene los destinos locales.
El primer intento unitario falló por permisos temporales de Vitest y el primer Maven por instrumentación Java en sandbox; ambos se repitieron fuera del sandbox y pasaron. Persisten ocho avisos SCSS de pantallas existentes, avisos Gradle de `flatDir` y avisos backend de Commons Logging, agentes JVM y compatibilidad Flyway/PostgreSQL.
La consulta real a Render falló primero por DNS restringido y, al reintentar con acceso de red, agotó 45 segundos para cada origen (`http://localhost:4200`, `https://localhost`). No se pudo certificar disponibilidad ni CORS desplegado. Las pruebas A–D en navegador/WebView quedan pendientes; no se confunden con las verificaciones unitarias ni con la compilación Android.

Referencias técnicas: [HTTP Angular](https://angular.dev/guide/http/making-requests), [configuración Capacitor](https://capacitorjs.com/docs/config).
