\# Casa de Música Castillo - Aplicación Móvil



Aplicación móvil desarrollada como extensión del sistema de comercio

electrónico Casa de Música Castillo.



El proyecto permitirá a los clientes acceder desde dispositivos móviles

a las principales funcionalidades de la plataforma, incluyendo

autenticación, catálogo, búsqueda de productos, favoritos, carrito,

checkout, pedidos y perfil de usuario.



\## Objetivo



Desarrollar una aplicación móvil para Casa de Música Castillo que permita

a los clientes consultar y adquirir instrumentos musicales y accesorios

desde dispositivos móviles, reutilizando los servicios disponibles en

la API REST del sistema existente.



\## Tecnologías utilizadas



\- Ionic

\- Angular

\- TypeScript

\- Capacitor

\- Android

\- Spring Boot API REST

\- PostgreSQL

\- Git

\- GitHub



\## Arquitectura general



La aplicación móvil funciona como cliente del Backend existente de

Casa de Música Castillo.



Aplicación móvil

&#x20;   ↓

Ionic + Angular

&#x20;   ↓

API REST

&#x20;   ↓

Spring Boot

&#x20;   ↓

PostgreSQL



\## Funcionalidades principales



\- Inicio de sesión.

\- Registro de clientes.

\- Recuperación de contraseña.

\- Pantalla de inicio.

\- Consulta del catálogo.

\- Búsqueda de productos.

\- Consulta del detalle de un producto.

\- Gestión de favoritos.

\- Carrito de compras.

\- Checkout.

\- Consulta de pedidos.

\- Detalle de pedidos.

\- Consulta y modificación del perfil.



\## Requisitos de desarrollo



Para ejecutar el proyecto se requiere:



\- Node.js

\- npm

\- Ionic CLI

\- Angular

\- Capacitor

\- Android Studio

\- JDK compatible con Android



\## Instalación



Clonar el repositorio:



```bash

git clone https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile.git



## Conexión web y Android

Consulta la [guía de conexión REST](docs/api-connection.md) para comprobar el origen y el destino de cada variante. Desarrollo web usa el backend local en localhost:8080. Para probar la configuración de producción en navegador desde el origen previsto:

```bash
npm start -- --configuration production --port 4200
```

Abre http://localhost:4200. El puerto es parte del origen CORS. Si está ocupado, detén tu servidor anterior o identifica el proceso con Get-NetTCPConnection -LocalPort 4200 antes de decidir cómo liberarlo. Aceptar otro puerto cambia el origen y el backend debe autorizarlo explícitamente.

En el emulador Android, 10.0.2.2 apunta al PC anfitrión. En un teléfono físico se necesita el build device y un destino de pruebas autorizado, como el túnel ADB descrito en la guía de TT-05. La variante de producción apunta a Render HTTPS.
