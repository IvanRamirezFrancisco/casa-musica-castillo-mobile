# Plan de Pruebas

## Casa de Música Castillo - Aplicación Móvil

**Proyecto:** Casa de Música Castillo - App Móvil  
**Metodología:** Extreme Programming (XP) + DevOps  
**Frontend móvil:** Ionic + Angular + TypeScript  
**Integración nativa:** Capacitor  
**Plataforma objetivo:** Android  
**Backend:** Spring Boot API REST  
**Base de datos:** PostgreSQL  
**Gestión:** GitHub Projects, GitHub Issues y GitHub Actions

---

## 1. Propósito

El presente Plan de Pruebas define la estrategia de validación y verificación de la aplicación móvil Casa de Música Castillo.

Su finalidad es establecer qué pruebas se realizarán, cuándo deberán ejecutarse, qué responsables participarán, qué evidencias deberán conservarse y qué condiciones deberán cumplirse antes de integrar o liberar cambios.

Las pruebas se encuentran relacionadas con las Historias de Usuario HU-01 a HU-14 y con las etapas TEST y SECURITY del flujo DevOps definido para el proyecto.

---

## 2. Objetivos

Los objetivos del proceso de pruebas son:

- Verificar que cada Historia de Usuario cumpla sus criterios de aceptación funcionales.
- Comprobar los criterios de aceptación de seguridad definidos para cada HU.
- Detectar errores antes de integrar cambios en las ramas compartidas.
- Evitar regresiones sobre funcionalidades previamente implementadas.
- Verificar que la aplicación compile correctamente.
- Validar la integración entre la aplicación móvil y la API REST.
- Comprobar autenticación y autorización.
- Validar el tratamiento seguro de entradas, sesiones y datos sensibles.
- Generar evidencias verificables.
- Automatizar progresivamente las pruebas mediante GitHub Actions.

---

## 3. Alcance

El plan contempla las funcionalidades definidas en las Historias de Usuario:

| HU    | Funcionalidad                     |
| ----- | --------------------------------- |
| HU-01 | Inicio de sesión                  |
| HU-02 | Registro de clientes              |
| HU-03 | Recuperación de contraseña        |
| HU-04 | Pantalla de inicio                |
| HU-05 | Catálogo de productos             |
| HU-06 | Búsqueda de productos             |
| HU-07 | Detalle de producto               |
| HU-08 | Favoritos                         |
| HU-09 | Agregar productos al carrito      |
| HU-10 | Administración del carrito        |
| HU-11 | Checkout                          |
| HU-12 | Consulta de pedidos               |
| HU-13 | Detalle de pedido                 |
| HU-14 | Consulta y modificación de perfil |

También se incluyen tareas técnicas relacionadas con calidad, seguridad, CI/CD, compilación Android y generación de artefactos.

---

## 4. Tipos de pruebas

### 4.1 Análisis estático

Su objetivo es detectar problemas de calidad del código sin ejecutar la aplicación.

Controles:

- ESLint.
- TypeScript.
- Validaciones del compilador Angular.
- Errores durante el build.

Comando base:

```bash
npm run lint
```

### 4.2 Pruebas unitarias

Su objetivo es comprobar componentes y unidades de código de forma aislada.

Se utilizarán principalmente:

- Angular TestBed.
- Vitest.
- Mocks de servicios cuando corresponda.

Se probarán progresivamente:

- componentes;
- servicios;
- validadores;
- guards;
- lógica de formularios;
- manejo de respuestas;
- manejo de errores.

### 4.3 Pruebas de integración

Validarán la interacción entre diferentes partes de la aplicación.

Ejemplos:

- Componentes con servicios.
- Servicios con HttpClient.
- Interceptores.
- Guards con autenticación.
- Manejo de sesión.
- Respuestas simuladas de la API.
- Manejo global de errores.

### 4.4 Pruebas funcionales

Las pruebas funcionales verifican los criterios de aceptación de las Historias de Usuario.

Se utiliza la nomenclatura:

```text
PF-HUXX-YY
```

Donde:

- `PF` = Prueba Funcional.
- `HUXX` = Historia de Usuario.
- `YY` = número consecutivo.

Ejemplo:

```text
PF-HU01-01
```

Cada prueba deberá registrar:

| Campo              | Descripción                              |
| ------------------ | ---------------------------------------- |
| ID                 | Identificador                            |
| HU                 | Historia relacionada                     |
| Precondición       | Estado necesario antes de probar         |
| Acción             | Operación realizada                      |
| Resultado esperado | Comportamiento correcto                  |
| Resultado obtenido | Resultado real                           |
| Estado             | APROBADA, FALLIDA, BLOQUEADA o PENDIENTE |
| Evidencia          | Captura, video, log o reporte            |

### 4.5 Pruebas de seguridad

Las pruebas de seguridad utilizan:

```text
PS-HUXX-YY
```

Se comprobarán aspectos como:

- autenticación;
- autorización;
- expiración de sesión;
- almacenamiento seguro;
- validación de entradas;
- aislamiento entre usuarios;
- manipulación de identificadores;
- manipulación de precios o cantidades;
- exposición de información sensible;
- manejo de errores;
- uso de HTTPS.

Las pruebas solamente se realizarán sobre los sistemas y ambientes autorizados del proyecto.

### 4.6 Pruebas de regresión

Después de integrar cambios relevantes se volverán a ejecutar las pruebas críticas ya aprobadas.

Prioridad de regresión:

1. Autenticación.
2. Carrito.
3. Checkout.
4. Pedidos.
5. Perfil.
6. Catálogo y búsqueda.
7. Favoritos.

Una nueva funcionalidad no deberá romper funcionalidades previamente aprobadas.

### 4.7 Smoke Testing

Cada versión candidata deberá comprobar al menos:

- inicio correcto de la aplicación;
- navegación principal;
- acceso al login;
- conexión con API cuando el ambiente esté disponible;
- ausencia de errores bloqueantes;
- instalación y ejecución del APK.

---

## 5. Pruebas de compilación

Antes de integrar cambios deberá comprobarse que el proyecto compile.

### Aplicación web/Ionic

```bash
npm run build
```

### Sincronización Android

```bash
npx cap sync android
```

### Android

La compilación Android deberá realizarse mediante Gradle.

Un fallo de compilación se considera bloqueante para la integración.

---

## 6. Pruebas de integración con la API

Cuando una HU consuma Spring Boot se comprobarán:

- respuestas válidas;
- HTTP 400;
- HTTP 401;
- HTTP 403;
- HTTP 404;
- errores 5xx;
- token inválido;
- token expirado;
- validaciones de backend;
- ausencia de información sensible innecesaria.

Las decisiones críticas de seguridad no deberán depender únicamente del cliente móvil.

Esto incluye:

- precios;
- stock;
- autorización;
- propiedad de carritos;
- propiedad de pedidos;
- propiedad de perfiles.

---

## 7. Pruebas Android

Se comprobarán progresivamente:

- instalación;
- ejecución;
- navegación;
- teclado;
- conectividad;
- persistencia de sesión;
- pérdida de conexión;
- integración Capacitor;
- instalación del APK generado.

---

## 8. Cobertura

La cobertura automatizada crecerá de manera progresiva.

Metas propuestas:

| Etapa                       |                    Meta |
| --------------------------- | ----------------------: |
| Baseline inicial            | 60 % en lógica cubierta |
| Desarrollo intermedio       |                    70 % |
| Lógica crítica estabilizada |  80 % cuando sea viable |

La cobertura no sustituye las pruebas funcionales ni las pruebas de seguridad.

---

## 9. Responsabilidades

### Ivan Francisco Ramírez

Responsabilidades principales:

- integración técnica;
- seguridad;
- API/backend;
- CI/CD;
- revisión de pruebas de seguridad;
- compilación Android;
- integración de ramas.

### Brayan Lara Barrios

Responsabilidades principales:

- frontend móvil;
- UI/UX;
- pruebas funcionales;
- pruebas de regresión;
- documentación de resultados;
- apoyo en automatización de pruebas.

Los dos integrantes participarán en revisiones mediante Pull Requests.

---

## 10. Criterios de entrada

Una funcionalidad puede pasar a pruebas cuando:

- su desarrollo principal está implementado;
- el proyecto compila;
- sus criterios de aceptación están definidos;
- existen casos PF y PS asociados;
- las dependencias necesarias se encuentran disponibles.

---

## 11. Criterios de salida

Una HU podrá considerarse terminada cuando:

- cumple sus criterios funcionales;
- cumple sus criterios de seguridad;
- se ejecutaron sus pruebas PF;
- se ejecutaron sus pruebas PS;
- no existen defectos bloqueantes;
- el código compila;
- las pruebas automatizadas disponibles pasan;
- existe evidencia;
- la integración se realizó mediante Pull Request cuando corresponda.

---

## 12. Estados de prueba

| Estado    | Significado                              |
| --------- | ---------------------------------------- |
| PENDIENTE | Todavía no ejecutada                     |
| APROBADA  | Resultado esperado obtenido              |
| FALLIDA   | El resultado no coincide con lo esperado |
| BLOQUEADA | No puede ejecutarse por una dependencia  |

---

## 13. Evidencias

Podrán utilizarse:

- capturas de pantalla;
- videos;
- logs;
- GitHub Actions;
- reportes de cobertura;
- resultados de análisis de seguridad;
- Pull Requests;
- commits;
- APK;
- resultados de pruebas manuales.

Las evidencias no deberán incluir:

- contraseñas;
- tokens;
- secretos;
- claves privadas;
- datos personales reales innecesarios.

---

## 14. Trazabilidad

La trazabilidad esperada será:

```text
Historia de Usuario
        ↓
Criterios de aceptación
        ↓
PF / PS
        ↓
Tarea técnica
        ↓
Rama
        ↓
Commit
        ↓
Pull Request
        ↓
GitHub Actions
        ↓
Resultado
```

---

## 15. Automatización prevista

La automatización seguirá progresivamente:

```text
Lint
 ↓
Unit Tests
 ↓
Integration Tests
 ↓
Coverage
 ↓
Build
 ↓
Security Checks
 ↓
Android Build
```

La ejecución automatizada se implementará mediante GitHub Actions.

---

## 16. Mantenimiento

Este documento deberá actualizarse si:

- cambian los criterios de aceptación;
- aparecen nuevos tipos de pruebas;
- se incorporan herramientas;
- cambia la arquitectura;
- cambia la estrategia CI/CD;
- aparecen nuevas funcionalidades.

---

## 17. Referencias internas

- `TRACEABILITY_MATRIX.md`
- `../security/SECURITY_CRITERIA.md`
- `../devops/CI_CD_PLAN.md`
- GitHub Issues HU-01 a HU-14
- GitHub Project Casa de Música Castillo - App Móvil
