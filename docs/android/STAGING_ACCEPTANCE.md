# Aceptación de staging en el Galaxy A55

## Staging V53 por Wi‑Fi local

Para aceptación física se puede usar la pasarela Caddy existente sobre una interfaz privada IPv4. Conservar el backend, Mailpit y PostgreSQL fuera de la interfaz publicada. Permitir solo las IP del Galaxy y de la estación de prueba. Validar con la CA privada el nombre de origen y probar el rechazo de checkout, administración, webhooks y rutas de depuración antes de instalar.

```powershell
node scripts/build-android.mjs --environment staging --variant lan --isolated --api-url https://<ip-privada>:18443 --lan-ca <certificado-ca-publico.pem>
```

El APK Debug `reports/android-packages/staging-lan/app-stagingLan.apk` instala `com.casademusicacastillo.app.staging.lan` junto al paquete comercial. La CA se empaqueta únicamente para el origen privado de staging y el navegador mantiene la validación TLS. La variante usa autenticación real y las rutas conectadas. ADB se puede usar para instalar y observar la UI. La aplicación se conecta mediante Wi‑Fi, con la lista de `adb reverse` vacía. La aceptación fuera de la LAN requiere un origen HTTPS de staging autorizado con acceso restringido.

Registrar el JAR efectivo y la huella de la APK. Para la verificación por correo y MFA utilizar únicamente cuentas sintéticas y el acceso local a Mailpit. Para acreditar pedidos con registros, usar un pedido sintético preexistente y conservar la protección de propiedad. El listado vacío acredita la lectura autenticada.


1. Confirmar con el operador un origen autorizado, DNS A/AAAA, certificado de confianza y salud desde una red permitida. Repetir desde una red no autorizada y registrar el rechazo.
2. Vincular el despliegue al backend candidato `a7e027d33272e93158a6236b57ce7eff64ed2af1` y a la configuración `f2f6fa1b27f8579c7c0ebdb290c5747f70cac86f`. Usar la red interna de Compose y un volumen nuevo. Antes de iniciar Spring, confirmar que el datasource efectivo apunta al servicio `postgres` y verificar `current_database()`, `current_user` e `inet_server_port()` desde el contenedor dedicado. Cualquier conexión al PostgreSQL habitual de Windows bloquea el ensayo. Verificar Flyway V52 y Mailpit antes de crear cuentas.
3. Confirmar bloqueo de checkout, pagos, administración y webhooks en la pasarela. Preparar dos cuentas sintéticas y un pedido sintético del propietario. Obtener enlaces y códigos por el acceso privado de Mailpit.
4. Compilar mediante la selección staging con el origen verificado y `--isolated`. El APK `reports/android-packages/staging-debug/app-stagingConnected.apk` usa el ID `com.casademusicacastillo.app.staging`, con cleartext deshabilitado. Registrar firma, huellas, CORS y resultados. Comprobar certificado y versión antes de actualizar una instalación con el mismo ID.

La revisión `a7e027d` contiene `POST /api/checkout/price-preview`. La lista de rutas de Caddy de `f2f6fa1` omite esa ruta y las de reseñas. Para aceptar cotización, el operador debe autorizar y comprobar el acceso de `POST` y preflight `OPTIONS` a la ruta exacta de vista previa. Mantener bloqueadas la confirmación, la pasarela de pago, administración y webhooks. Consultar reseñas y enviar una reseña requieren validar sus rutas por separado.

| Caso | Resultado esperado |
|---|---|
| Registro, verificación y sesión | Bloqueo antes de verificar, login tras verificación, persistencia al cerrar y abrir, limpieza tras logout/401. |
| Recuperación | Cambio de contraseña mediante correo capturado. Rechazo de la contraseña anterior y del token reutilizado. |
| MFA EMAIL y TOTP | Código válido permite acceso, código erróneo se rechaza, límites efectivos. TOTP enrolado persiste y se puede desactivar según el flujo autorizado. |
| Favoritos y carrito | Los cambios persisten. La cuenta B no hereda datos de A. Las validaciones responden a cambios autorizados de precio y stock. |
| Perfil y pedidos | A consulta su perfil y su pedido sintético. B no puede consultar el pedido de A. Verificar ID inválido y reintento. |
| Red y límites | Repetir por Wi-Fi sin cable, registrar error y recuperación. Checkout y pagos siguen bloqueados. |
| Cotización | Con carrito sintético, comprobar los métodos de entrega y la cotización del servidor. Confirmación y pagos permanecen bloqueados. |
| Visor | Revisar foto vertical y horizontal, pinch 1×–4×, pan, doble toque, cambio a 1×, miniaturas, foto fallida, foco, TalkBack y Atrás en ambas orientaciones. |

Registrar por caso SHA del APK, revisión del backend, dispositivo, red y resultado. Excluir credenciales, tokens, códigos y datos personales de la evidencia. Las suites de Angular y Postman cubren parte del contrato. La aceptación de esta tabla requiere staging autorizado. OWASP y SonarCloud quedan pendientes antes de promover el candidato.
