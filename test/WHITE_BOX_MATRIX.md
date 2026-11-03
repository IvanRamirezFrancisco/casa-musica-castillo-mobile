# Matriz de caja blanca

Rutas relativas a la raíz. Aserciones abreviadas fielmente; consultar cada especificación para su contexto. IDs documentales, no casos duplicados. Los casos parametrizados ejecutan todas sus variantes.

| ID | Clase / función | Método | Condición / rama / límite | Resultado esperado y aserción | Archivo de prueba |
|---|---|---|---|---|---|
| CB-01 | DemoOrderFactory | create | Productos, entrega y pago válidos | Subtotal 4980, envío 150, total 5130; `summary.toEqual(...)`; ID `DEMO-` único | `src/app/core/factories/demo-order.factory.spec.ts` |
| CB-02 | DemoOrderFactory | create | Cantidad 0, -1, 1.5, NaN, Infinity | Excepción en cada variante; `toThrow()` | mismo archivo |
| CB-03 | DemoOrderFactory | create | Precio -1/NaN/Infinity, carrito vacío, entrega/pago ausentes, envío negativo | No crea pedido; `toThrow()` | mismo archivo |
| CB-04 | DemoOrderFactory | create / toHistory | Mutar entradas o historial después de crear | Copias independientes; cantidad original 2 y envío 150 permanecen | mismo archivo |
| CB-05 | HttpPublicCatalogRepository | catalog | Búsqueda/categoría/orden/página y consulta pública | Parámetros codificados; sin Authorization ni credenciales; `request.params`, `headers` | `src/app/core/infrastructure/http-public-catalog.repository.spec.ts` |
| CB-06 | HttpPublicCatalogRepository | catalog / product | Página fuera de rango, búsqueda larga, ID inválido | Acota parámetros; ID inválido falla sin petición; `expectNone()` | mismo archivo |
| CB-07 | HttpPublicCatalogRepository | categories / product | JSON incompatible / timeout de transporte | `ApiError`, conexión recuperable, sin productos inventados | mismo archivo |
| CB-08 | PublicCatalogService | load | Filtros rápidos con respuestas fuera de orden | Cancela/ignora respuesta antigua; sólo estado de última consulta | `src/app/core/services/public-catalog.service.spec.ts` |
| CB-09 | PublicCatalogService | retry / retryProduct | Excepción síncrona o HTTP y nuevo intento | Conserva filtros, stream sigue activo, pasa de error a ready | mismo archivo |
| CB-10 | CartService | addProduct / setItemQuantity / removeItem | productId distinto de itemId | POST por producto, PUT/DELETE por partida; sin GET adicional; cuerpo exacto | `src/app/core/services/cart.service.spec.ts` |
| CB-11 | CartService | setItemQuantity | Rango 1..100, cantidades e IDs inválidos | Límite correcto, no HTTP inválido; `expectNone()` | mismo archivo |
| CB-12 | CartService | load / reset | Respuesta atrasada y cierre de sesión | Descarte por secuencia, carrito y badge limpios | mismo archivo |
| CB-13 | parsePricePreview | parsePricePreview | Importes negativos/no finitos, flags no booleanas, respuesta null | `toThrow(ApiError)`; total válido se conserva sin recalcularlo | `src/app/core/api/checkout.validation.spec.ts` |
| CB-14 | CheckoutQuoteStateService | load | Cambiar PICKUP→LOCAL antes de respuesta | Primera suscripción cancelada, total nuevo 15230, respuesta vieja ignorada | `src/app/core/services/checkout-quote-state.service.spec.ts` |
| CB-15 | CheckoutQuoteStateService | invalidate | Editar destino / terminar sesión | `quote=null`, `loading=false`, solicitud cancelada | mismo archivo |
| CB-16 | CheckoutQuoteStateService | load | JSON inválido, 401, 403, conexión, 500 | Mensaje diferenciado, sin importes; `error.toContain(...)`, quote null | mismo archivo |
| CB-17 | CheckoutQuoteStateService | load | Adaptador lanza excepción síncrona; reintento válido | No filtra diagnóstico, stream se recupera y entrega total 15230 | mismo archivo |
| CB-18 | ConnectedCheckoutComponent / HttpCheckoutRepository | submit / submitCheckout | Flag de escritura false | Rechazo en vista y adaptador, `expectNone('/api/checkout')` | `src/app/features/checkout/connected-checkout.integration.spec.ts` |
| CB-19 | ConnectedCheckoutComponent | submit | Dirección ausente, notas >1000, stock insuficiente | No confirmación; `expectNone()` y mensaje específico | mismo archivo |
| CB-20 | ConnectedCheckoutComponent | requestPreview | Respuesta incompleta `{total:'incorrecto'}` y reintento | Error visible, sin endpoints en UI, cotización válida posterior | mismo archivo |
| CB-21 | authGuard / safeReturnUrl | authGuard / safeReturnUrl | Invitado, JWT vencido, sesión válida, URL externa | Invitado→login con retorno interno; válida→true; externa→fallback | `src/app/core/security/session-security.integration.spec.ts` |
| CB-22 | authInterceptor | authInterceptor | Petición pública / autenticada / host externo | JWT sólo en backend autenticado; nunca host externo | mismo archivo |
| CB-23 | authInterceptor / AuthService | handleUnauthorized | 401 frente a 403 | 401 limpia sesión; 403 conserva identidad | mismo archivo |
| CB-24 | ConnectedProfileComponent / EditProfilePage | reload / save | Perfil de otro ID / edición conectada sin contrato | No muestra identidad ajena; no formulario, POST/PUT/PATCH ni cambio DEMO | `src/app/features/profile/connected-profile.integration.spec.ts` |
| CB-25 | Router / SplashPage | arranque / navegación | Invitado y rutas públicas/privadas | Splash→Inicio; cinco tabs; retorno Ionic consistente | `src/app/app.routes.integration.spec.ts` |

La suite completa añade autenticación con/sin desafío, EMAIL/TOTP/BACKUP_CODE, límites, logout, UI y regresión. Consultar `src/app/core/services/auth.service.spec.ts`, `src/app/core/infrastructure/http-auth.repository.spec.ts`, `src/app/core/infrastructure/http-account-security.repository.spec.ts` y `src/app/features/profile/account-security.page.spec.ts`; no se presentan como pruebas reales contra Spring Boot.
