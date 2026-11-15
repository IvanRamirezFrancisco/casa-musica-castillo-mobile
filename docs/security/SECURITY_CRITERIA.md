# Criterios de Seguridad

## Casa de Música Castillo - Aplicación Móvil

## 1. Objetivo

Este documento establece los criterios de seguridad transversales de la aplicación móvil Casa de Música Castillo.

Complementa los criterios de aceptación de seguridad definidos individualmente dentro de HU-01 a HU-14.

---

## 2. Principios generales

El proyecto deberá aplicar:

- mínimo privilegio;
- defensa en profundidad;
- validación del lado servidor;
- autenticación para recursos privados;
- autorización para operaciones protegidas;
- comunicaciones cifradas;
- protección de información sensible;
- manejo seguro de errores;
- reducción de superficie de ataque;
- no confiar en información controlable únicamente desde el cliente.

---

## 3. Autenticación

La aplicación deberá:

- autenticar antes de permitir funciones privadas;
- no almacenar contraseñas;
- gestionar tokens inválidos;
- gestionar tokens expirados;
- invalidar sesiones cuando corresponda;
- utilizar la identidad autenticada para acceder a recursos privados.

---

## 4. Sesión y tokens

La información de sesión deberá mantenerse utilizando un mecanismo apropiado para aplicaciones móviles.

No deberán almacenarse de forma insegura:

- contraseñas;
- credenciales;
- secretos;
- tokens innecesarios;
- claves privadas.

La aplicación deberá conservar únicamente la información mínima necesaria.

---

## 5. Comunicación con la API

Todas las comunicaciones sensibles deberán realizarse mediante HTTPS.

No deberán enviarse por canales inseguros:

- credenciales;
- tokens;
- datos personales;
- información de pedidos;
- información relacionada con pagos.

---

## 6. Autorización

La autorización definitiva deberá realizarse en backend.

El cliente móvil no deberá considerarse una frontera de seguridad.

Ejemplo:

```text
Usuario A
   ↓
solicita pedido de Usuario B
   ↓
Backend
   ↓
ACCESO RECHAZADO
```

Esto aplica también a:

- favoritos;
- carritos;
- pedidos;
- perfiles;
- demás recursos privados.

---

## 7. Validación de entradas

Se deberán validar:

- correo;
- contraseña;
- cantidades;
- búsquedas;
- identificadores;
- datos de perfil;
- datos de checkout.

Las validaciones del frontend mejoran la experiencia del usuario, pero el backend deberá repetir las validaciones necesarias.

---

## 8. Contenido dinámico y búsqueda

Las entradas se tratarán como datos.

No deberán ejecutarse como:

- HTML;
- JavaScript;
- código;
- consultas construidas inseguramente.

El contenido remoto no deberá insertarse mediante técnicas inseguras.

---

## 9. Manejo de errores

Los mensajes dirigidos al usuario no deberán revelar:

- stack traces;
- consultas SQL;
- rutas internas;
- nombres de infraestructura;
- tokens;
- claves;
- secretos.

Los errores deberán ser comprensibles y controlados.

---

## 10. Logs

No deberán almacenarse en logs:

- contraseñas;
- tokens completos;
- secretos;
- datos financieros sensibles;
- información personal innecesaria.

Los logs deberán contener únicamente información útil para diagnóstico.

---

## 11. Registro de usuarios

Durante el registro:

- los campos serán validados;
- la contraseña no deberá almacenarse localmente;
- el cliente no podrá asignarse roles privilegiados;
- el backend controlará los campos permitidos;
- los errores internos no deberán exponerse.

---

## 12. Recuperación de contraseña

El flujo deberá:

- evitar facilitar enumeración de cuentas;
- utilizar códigos o tokens temporales;
- impedir reutilización indebida;
- evitar exposición de tokens;
- nunca revelar la contraseña existente.

---

## 13. Favoritos

Las operaciones deberán:

- requerir autenticación cuando corresponda;
- utilizar la identidad autenticada;
- impedir modificar favoritos de otro usuario.

---

## 14. Carrito

El backend deberá validar:

- producto;
- cantidad;
- stock;
- disponibilidad;
- precio;
- propiedad del carrito.

El cliente móvil no será autoridad sobre precios ni totales.

---

## 15. Checkout

Antes de crear un pedido el backend deberá validar nuevamente:

```text
productos
+
cantidades
+
stock
+
precios
+
descuentos
+
total
+
usuario
```

La aplicación deberá reducir el riesgo de pedidos duplicados.

No deberán almacenarse datos sensibles de pago fuera de mecanismos autorizados.

---

## 16. Pedidos

El backend deberá comprobar que el usuario tenga autorización sobre el pedido solicitado.

Modificar un identificador en el cliente no deberá permitir consultar pedidos de otro usuario.

---

## 17. Perfil

La API solo deberá devolver la información necesaria.

No deberán exponerse innecesariamente:

- contraseña;
- hash de contraseña;
- tokens;
- secretos;
- roles internos;
- datos de otros usuarios.

El backend deberá definir explícitamente qué campos pueden modificarse.

---

## 18. Dependencias

Las dependencias deberán revisarse periódicamente.

Se utilizarán controles automatizados para localizar vulnerabilidades conocidas.

Los hallazgos deberán evaluarse de acuerdo con:

- severidad;
- explotabilidad;
- contexto;
- componente afectado.

Una vulnerabilidad no deberá ignorarse únicamente para conseguir un pipeline exitoso.

---

## 19. Secretos

Está prohibido almacenar en Git:

- contraseñas;
- tokens privados;
- API keys privadas;
- claves criptográficas;
- keystores Android privados;
- credenciales de base de datos;
- secretos de producción.

Cuando sean necesarios se utilizarán mecanismos seguros de variables o secretos.

---

## 20. Git y Pull Requests

El desarrollo seguirá:

```text
feature/* / chore/* / fix/*
            ↓
       Pull Request
            ↓
       revisión
            ↓
     CI + SECURITY
            ↓
         develop
```

Los cambios hacia `main` deberán seguir un flujo controlado.

---

## 21. Controles automatizados

Se incorporarán progresivamente:

- análisis de dependencias;
- análisis estático;
- detección de vulnerabilidades;
- revisión de secretos;
- pruebas PS-HUXX-\*.

La automatización complementa las pruebas manuales y no las sustituye.

---

## 22. Criterios de bloqueo

Una versión no deberá liberarse cuando exista una vulnerabilidad conocida que permita:

- omitir autenticación;
- acceder a información de otro usuario;
- exponer credenciales;
- modificar precios o totales de manera no autorizada;
- acceder a pedidos ajenos;
- acceder a perfiles ajenos;
- exponer secretos del sistema.

Las vulnerabilidades críticas deberán ser tratadas antes de liberar la versión.

---

## 23. Evidencia

Las pruebas de seguridad podrán registrar:

```text
ID de prueba:
HU:
Fecha:
Responsable:
Resultado:
Hallazgo:
Severidad:
Mitigación:
Estado:
Evidencia:
```

Las evidencias no deberán contener secretos reales.

---

## 24. Relación con Historias de Usuario

Los criterios específicos se encuentran dentro de:

```text
HU-01 ... HU-14
```

mediante:

```text
PS-HUXX-YY
```

Este documento contiene las reglas generales aplicables a todo el proyecto.

---

## 25. Mantenimiento

Este documento deberá actualizarse cuando:

- cambie la autenticación;
- cambie la API;
- cambie el almacenamiento móvil;
- aparezcan nuevas funcionalidades;
- aparezcan nuevos proveedores;
- se identifiquen nuevos riesgos.
