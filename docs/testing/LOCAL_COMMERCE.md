# Pruebas locales de comercio móvil

Development usa las rutas conectadas y apunta a `http://localhost:8080` en navegador y a `http://10.0.2.2:8080` en el emulador Android. Production conserva su origen oficial y su política de escrituras. Los tests del frontend mantienen su configuración de rutas de prueba.

## Arranque

1. Usar Java 21 y compilar el backend local con Maven. Arrancar Spring con el perfil `local` y enlazarlo a loopback para pruebas en navegador.
2. Crear una base **exclusiva de pruebas** en un clúster PostgreSQL dedicado. Antes de iniciar Spring, consultar `current_database()`, `current_user`, `inet_server_addr()` e `inet_server_port()` y confirmar la identidad esperada de la base y la conexión. Establecer explícitamente el datasource y no heredar variables de conexión o proveedores comerciales.
3. En una base vacía, incluir el `V1__legacy_test_schema.sql` de las pruebas del backend en una ubicación de Flyway, además de `classpath:db/migration`. V4 presupone tablas preexistentes. Crear en ese clúster el rol histórico `spring_app` sin login si la migración V11 lo requiere. Mantener Flyway activo y verificar su historial.
4. Generar credenciales efímeras independientes para PostgreSQL y JWT, y una clave efímera de 32 bytes para la recogida. Pasarlas al proceso sin imprimirlas ni guardarlas en el repositorio. Mantener Mercado Pago desactivado, usar almacenamiento local y dirigir SMTP únicamente al Mailpit local cuando esté disponible.
5. Confirmar que `/actuator/health` devuelve `UP`. Configurar CORS para el origen local de Angular y ejecutar `npm start -- --configuration development --port 4200`.

| Ajuste de Spring | Valor local |
| --- | --- |
| `SPRING_PROFILES_ACTIVE`, `SERVER_ADDRESS` | `local`, `127.0.0.1` |
| `SERVER_PORT`, `PORT` | `8080` o el puerto de prueba reservado |
| `SPRING_DATASOURCE_URL` | JDBC a la base PostgreSQL dedicada que se acaba de verificar |
| `SPRING_FLYWAY_LOCATIONS` | `classpath:db/migration,filesystem:<directorio-del-esquema-de-prueba>` |
| `APP_SECURITY_JWT_SECRET`, `PICKUP_CODE_ENCRYPTION_KEY` | Dos secretos efímeros independientes. El segundo tiene 32 bytes. |
| `EMAIL_PROVIDER`, `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT` | `smtp`, `127.0.0.1`, `1025` con Mailpit. Usar un `EMAIL_FROM` de prueba. |
| `CORS_ORIGINS`, `CORS_ALLOWED_ORIGINS` | Incluir el origen exacto que sirve Angular. |
| `STORAGE_PROVIDER`, `MERCADO_PAGO_ENABLED` | `LOCAL`, `false` |

Si los puertos habituales están ocupados, mantener los procesos existentes. Para compilar con otra API estrictamente local se puede usar Node con los siguientes argumentos, sustituyendo el puerto por el de la instancia aislada:

```text
ng build --configuration development --define CMC_DEVICE_API_URL='"http://127.0.0.1:18083"'
```

El valor del define debe ser una cadena JavaScript entre comillas dobles. Servir la salida en el puerto local alterno y autorizar ese origen en CORS del backend de prueba. En Android, `127.0.0.1` corresponde al dispositivo. Usar el origen de emulador o una variante de integración aislada ya admitida por el proyecto.

## Verificación

Usar cuentas sintéticas. Confirmar registro, activación y MFA por correo con Mailpit cuando corresponda. Probar las mutaciones de carrito y favoritos con sesión válida e incluir una segunda cuenta para verificar propiedad. Conservar solo método, ruta y estado HTTP en las evidencias. Evitar escrituras de prueba en Railway.

En navegador, recargar intencionalmente pierde la sesión en memoria. La prueba de restauración de sesión cifrada requiere emulador o dispositivo Android y backend aislado; las pruebas unitarias del almacén nativo no acreditan por sí solas esa restauración.
