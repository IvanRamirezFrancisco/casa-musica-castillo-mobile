# Casa de Música Castillo - Aplicación Móvil

Aplicación móvil desarrollada como extensión del sistema de comercio electrónico **Casa de Música Castillo**. El proyecto permite organizar el desarrollo de una experiencia móvil para autenticación, catálogo, búsqueda, favoritos, carrito, checkout, pedidos y perfil, reutilizando la API REST existente.

## Objetivo

Desarrollar una aplicación móvil para Casa de Música Castillo que permita a los clientes consultar y adquirir instrumentos musicales y accesorios desde dispositivos Android, integrándose con los servicios existentes del sistema web.

## Tecnologías

- Ionic
- Angular
- TypeScript
- Capacitor
- Android
- Spring Boot (API REST)
- PostgreSQL
- Git
- GitHub
- GitHub Projects

## Arquitectura general

```text
Aplicación móvil
      |
Ionic + Angular
      |
Capacitor / Android
      |
API REST
      |
Spring Boot
      |
PostgreSQL
```

La aplicación móvil actúa como cliente del Backend existente y consume los servicios expuestos mediante API REST.

## Funcionalidades principales

- Inicio de sesión.
- Registro de clientes.
- Recuperación de contraseña.
- Pantalla de inicio.
- Consulta del catálogo.
- Búsqueda de productos.
- Detalle de producto.
- Gestión de favoritos.
- Carrito de compras.
- Checkout.
- Consulta de pedidos.
- Detalle de pedidos.
- Consulta y modificación del perfil.

## Requisitos de desarrollo

- Node.js
- npm
- Ionic CLI
- Angular CLI
- Android Studio
- JDK compatible con Android
- Git

## Instalación

```bash
git clone https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile.git
cd casa-musica-castillo-mobile
npm install
```

## Ejecución en navegador

```bash
ionic serve
```

## Compilación

```bash
ionic build
```

## Sincronización con Android

```bash
npx cap sync android
```

## Abrir Android Studio

```bash
npx cap open android
```

## Metodología de trabajo

El proyecto se organiza mediante **Extreme Programming (XP)** y prácticas **DevOps**.

GitHub Projects se utiliza en la etapa **PLAN** para administrar:

- Product Backlog.
- Historias de usuario.
- Tareas técnicas.
- Iteraciones XP.
- Prioridad.
- Story Points.
- Responsables.
- Estados.
- Productos verificables.

La trazabilidad prevista es:

```text
GitHub Project
      |
GitHub Issue
      |
feature/HU-XX-descripcion
      |
Commit
      |
Pull Request
      |
develop
      |
main
```

## Estrategia de ramas

- `main`: versiones estables.
- `develop`: integración del trabajo del equipo.
- `feature/HU-XX-descripcion`: desarrollo de historias de usuario.

Después de la configuración inicial, los cambios deben integrarse mediante Pull Requests y no mediante trabajo directo sobre `main`.

## Integrantes

- **Ivan Francisco Ramírez**: desarrollo, integración, API/Backend, seguridad y DevOps.
- **Brayan Lara Barrios**: frontend móvil, UX/UI y pruebas.

Los docentes participan como revisores del proceso académico.

## Estado del proyecto

Proyecto académico en desarrollo durante el cuatrimestre septiembre-diciembre de 2026.