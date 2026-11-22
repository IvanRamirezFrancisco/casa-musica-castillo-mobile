# Activación de cuenta — auditoría backend y pendientes

Estado: **solo lectura; ningún parche ni cambio de código aplicado**. Requiere autorización posterior para implementar.

Nota histórica del 18 de noviembre de 2026: el estado anterior describe esta auditoría inicial. Posteriormente se autorizó y creó únicamente `fix/account-activation-hardening` en el checkout backend existente. Los hallazgos se implementaron y verificaron según el informe backend `docs/ACCOUNT_ACTIVATION_HARDENING.md`; sus resultados y riesgos residuales sustituyen la lista de pendientes de esta instantánea. Se conserva el texto original como línea base, sin afirmar que se modificó main.

La fuente actual auditada está en el worktree preexistente `.local-worktrees/spring-public-runtime`, rama `main`, HEAD `30a8c5ab9c85d58fe998935d7725edf3d2d3ba2f`. Permaneció limpio. La carpeta principal histórica del backend está en `codex/integrate-brevo-original`, HEAD `44df746`, con cambios locales anteriores: no se alteró, cambió de rama ni se sobrescribió. No se crearon ramas ni worktrees.

## Contratos y controles existentes que deben conservarse

| Operación | Contrato existente |
|---|---|
| Registro | POST `/api/auth/register`, RegisterRequest y legalAcceptance cuando la política lo exige; respuesta pública neutral, sin JWT |
| Reenvío | POST `/api/auth/resend-verification`, `{email}`; no envía a inexistentes ni a cuentas verificadas |
| Código | POST `/api/auth/verify-email-code`, `{email, code}`; cadena de seis dígitos, no un número |
| Enlace | POST `/api/auth/verify-email`, `{token}`; conserva tokens anteriores compatibles |
| Enlace antiguo del servidor | GET `/api/auth/verify?token=...`; redirige al frontend configurado, no a una URL del cliente |

`UserService.createUser` crea la cuenta deshabilitada en una transacción corta. Los duplicados no sobrescriben nombre, contraseña ni teléfono. Los conflictos de unicidad se neutralizan tras rollback. `VerificationService` genera códigos con SecureRandom, protege el OTP con HMAC-SHA256 vinculado al usuario y digest del enlace, almacena SHA-256 versionado para enlaces nuevos y admite el formato anterior. Revalida destinatario bajo bloqueo pesimista de la cuenta. Los intentos de código se guardan en PostgreSQL: máximo cinco. Código y enlace son de uso único y convergen en la misma activación. El éxito no emite JWT ni sustituye Login o MFA.

La entrega por cuenta tiene hoy un cooldown de **30 segundos** y máximo **3 desafíos en 5 minutos**, comprobados sobre registros de PostgreSQL y bajo el bloqueo de cuenta. Esas protecciones sí sobreviven al proceso y se comparten si las instancias usan la misma base. No deben sustituirse por un contador Angular ni relajarse.

## Pendientes concretos, sin aplicar

1. **Límite IP en memoria y ausencia de cuotas compartidas.** `src/main/java/com/security/service/VerificationRequestLimit.java` usa Caffeine con tamaño máximo 10.000 y ventanas fijas de cinco minutos. `AuthController.java` aplica 30 solicitudes de registro, 30 de reenvío y 60 de verificación por IP/ventana, separadas por operación. Ese contador desaparece al reiniciar, no es compartido entre instancias y puede ser desalojado de caché. No hay cuota global de entrega ni diaria por destinatario en ese código. La cuota por cuenta en VerificationService es una protección diferente y permanece válida.

   Cambio a evaluar: conservar ventanas actuales como punto de partida y parametrizarlas; añadir un contador compartido mediante PostgreSQL con incremento atómico, claves normalizadas/protegidas y caducidad. Una migración aditiva de una tabla de límites no necesita cambiar arbitrariamente la tabla users ni introducir Redis. Definir expresamente cuotas diaria/global según la política aprobada: no se aplicaron las cifras orientativas de 60 s o 3/15 min. Mantener límites de envío separados de verificación.

   Archivos previstos: VerificationRequestLimit.java, AuthController.java, configuración tipada de la política y una migración Flyway nueva cuyo número se confirme al autorizar. Pruebas: paralelismo, mismo destinatario normalizado, ventanas, reinicio, dos instancias, presión/evicción y no superación del límite global. No ejecutar estas pruebas de abuso en producción.

2. **IP real detrás de un proxy.** Los endpoints citados usan getRemoteAddr(). Es preferible a aceptar X-Forwarded-For de cualquier origen, pero debe verificarse qué dirección entrega el contenedor detrás del proxy autorizado. No cambiarlo por confianza ciega en cabeceras. Documentar redes/proxies confiables y probar múltiples cabeceras falsas, saltos y tráfico directo. Revisar AuthController.java y la configuración de forwarding del servidor/infraestructura antes de modificarla.

3. **Rotación antes de confirmar la entrega.** `VerificationService.issue` invalida desafíos previos, crea el nuevo y confirma la transacción; `deliver` envía después. Si el proveedor falla, deliver marca usado el nuevo desafío y devuelve 503. Por tanto, un reenvío fallido puede dejar sin utilidad el código anterior que aún era válido. El frontend no puede restaurarlo de forma segura.

   Cambio necesario: separar preparación y publicación del reemplazo, proteger la vigencia del anterior y distinguir fallo seguro de resultado incierto del proveedor. Si se necesita una entrega transaccional, evaluar un registro/outbox idempotente que reutilice EmailService, con desafío/destinatario vinculados, bloqueo de cuenta, deduplicación y reintentos acotados. No crear otro servicio de correo. Un resultado incierto SMTP no permite prometer entrega exactamente una vez. Una respuesta tardía nunca debe desactivar una cuenta ya verificada ni reabrir un desafío usado.

   Archivos previstos: VerificationService.java, VerificationToken.java, VerificationTokenRepository.java y, solo si el diseño aprobado lo necesita, una migración aditiva de estado de entrega. Pruebas: proveedor rechaza antes de aceptar; acepta y pierde la respuesta; usuario verifica mientras se reenvía; registro duplicado concurrente; reintento ambiguo; proceso cae tras commit; desafío anterior sigue siendo utilizable según la política; éxito consume todas las alternativas de esa cuenta. Este fallo de proveedor no se reprodujo sobre servicios compartidos: se identificó leyendo el código y queda pendiente.

4. **Reintentos y fallback del proveedor ante respuestas ambiguas.** EmailService.java intenta Brevo dos veces ante fallos temporales/de transporte y después permite otros transportes. Un timeout puede ocurrir después de que el proveedor aceptó el mensaje. Revisar qué errores permiten reintentar y cuáles deben quedar como entrega incierta, usando deduplicación del proveedor solamente si su contrato la garantiza. Evitar repetir automáticamente por distintos proveedores un envío que pudo haber sido aceptado. Conservar SMTP local para QA y no probar estos casos con Brevo real o destinatarios de clientes.

   Pruebas previstas: EmailServiceTransportTest, AuthMailContentTest y una captura SMTP/HTTP aislada que simule aceptación con respuesta perdida. Ninguna prueba debe escribir OTP, enlaces ni claves reales en logs.

5. **Neutralidad pública y tiempos observables.** Registro repetido y reenvío de cuenta activa/inexistente ya ofrecen respuestas neutras en el camino normal; esto se verificó contra el servidor local. Sin embargo, la rama de entrega síncrona puede producir 503 y una latencia distinta solo cuando hay un destinatario elegible. No se puede certificar protección contra enumeración temporal o durante fallos del proveedor con los mensajes Angular. Evaluar aceptación pública neutral y entrega desacoplada/idempotente, manteniendo errores específicos de formato. No introducir esperas arbitrarias para aparentar tiempos iguales.

   Pruebas previstas: comparar status, JSON y distribución de latencias para inexistente, activa, pendiente y duplicada, con proveedor disponible y fallando. Usar únicamente datos sintéticos. Revalidar elegibilidad de cuentas deshabilitadas administrativamente sin prueba de correo, diferenciándolas de un auto-registro pendiente; revisar pendingSelfRegistration antes de alterar esa política.

6. **Vencimiento del código y del enlace.** La implementación actual de VerificationService.issue comparte expiryDate y fija 24 horas. El contador de cinco intentos del código es persistente, pero no existe una caducidad independiente de 10–15 minutos. Evaluar la separación como política explícita; no cambiar silenciosamente enlaces emitidos. Un campo nullable de expiración de código, con compatibilidad de las filas existentes y una migración aditiva, es una alternativa a revisar.

   Archivos previstos: VerificationService.java, VerificationToken.java, repositorio, configuración de política y migración si corresponde. Pruebas con reloj controlado: antes/en/después del límite; código vencido con enlace aún válido; enlaces antiguos hasta su vigencia original; reenvío, simultaneidad y máximo de intentos. No se implementó ni se aprobó una ventana nueva.

7. **Retry-After.** Los límites públicos actuales no proporcionan de forma consistente Retry-After/remainingTimeSeconds. Añadir metadatos precisos al 429 de límites independientes del estado de una cuenta, sin convertir la elegibilidad en un canal de enumeración. El frontend ya acepta el encabezado en segundos o fecha HTTP y mantiene compatibilidad con el cuerpo anterior. Su espera de envío de 30 s refleja el cooldown actual y es solo UX: no afirma que el servidor autorizará el siguiente envío.

8. **App Links y registros de URL.** EmailService conserva `/verify-account?token=...`; Development usa la base configurada local y Production mantiene la web oficial. El móvil añade únicamente un alias Angular al componente existente. El AndroidManifest actual no contiene App Links HTTPS verificados ni se encontró manejo appUrlOpen. Abrir la web no demuestra apertura nativa. La asociación de dominio, assetlinks y pruebas físicas requiere un trabajo posterior autorizado, sin cambiar claves/versiones por esta tarea. La aplicación limpia el token visible y no lo persiste; revisar también la redacción de query strings en logs de proxy/CDN/analítica, que no se modificaron.

## Validación realizada y límites de la evidencia

Se ejecutó el **JAR existente con OTP del worktree actual**, sin compilar ni editar Java, con Spring local, PostgreSQL desechable verificado y Mailpit SMTP de loopback. El JAR antiguo de la carpeta histórica no contiene VerifyEmailCodeRequest y no sirve para comprobar este contrato: no se reemplazó ni se modificó el proceso de desarrollo cotidiano.

Se confirmaron: cuenta no autenticable antes de verificar; registro sin JWT; duplicado no sobrescribe credenciales/datos; un reenvío inmediato no crea otro correo; código incorrecto; dos verificaciones concurrentes con un solo éxito; rechazo de reutilización de código y enlace; cinco fallos bloquean el código y permiten el enlace; Login posterior; respuestas normales iguales para activa/inexistente. El navegador confirmó registro→OTP→Login y registro→enlace con dos correos capturados, cero reenvíos automáticos y cero llamadas a Railway.

No se certificaron cuotas diaria/global inexistentes, supervivencia de Caffeine entre procesos, igualdad temporal, fallos ambiguos reales del proveedor, App Links o dispositivo físico. No se ejecutó la suite JUnit ni se afirma que haya aprobado. Al autorizar backend, ampliar las pruebas ya existentes (AuthEmailFlowsIntegrationTest, AuthEndpointSecurityTest, EmailServiceTransportTest, AuthMailContentTest), además de PostgreSQL, concurrencia, reinicio y réplicas; no eliminar pruebas o sus aserciones. Revisar el extractor MIME de activación: el OTP de activación usa un párrafo HTML y texto alternativo, distinto del contenedor class=code de otros mensajes.

**Producción y Git del backend permanecen intactos. No se aplicaron parches ni se solicitó una excepción nueva a las restricciones.**
