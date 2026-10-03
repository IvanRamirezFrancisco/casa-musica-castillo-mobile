# Plan de Integración y Entrega Continua

## Casa de Música Castillo - Aplicación Móvil

## 1. Objetivo

Este documento define el proceso de integración continua, pruebas, seguridad, compilación Android, entrega y liberación de versiones de la aplicación móvil Casa de Música Castillo.

El proceso utiliza Extreme Programming (XP) junto con prácticas DevOps.

---

## 2. Ciclo DevOps

El proyecto utiliza las siguientes etapas:

```text
PLAN
 ↓
CODE
 ↓
BUILD
 ↓
TEST
 ↓
SECURITY
 ↓
RELEASE
 ↓
DEPLOY
 ↓
MONITOR
```

Estas mismas etapas se encuentran representadas dentro de GitHub Projects mediante el campo `Etapa DevOps`.

---

## 3. PLAN

La herramienta principal de planeación es GitHub Projects.

En esta etapa se administran:

- Product Backlog;
- Historias de Usuario;
- tareas técnicas;
- responsables;
- prioridades;
- Story Points;
- Iteraciones XP;
- Status;
- sub-issues;
- dependencias;
- productos verificables;
- Etapa DevOps.

---

## 4. CODE

El código será administrado mediante Git y GitHub.

Estrategia de ramas:

```text
main
 ↑
develop
 ↑
feature/*
chore/*
fix/*
```

### main

Representa versiones estables y aprobadas.

### develop

Representa la rama de integración del equipo.

### feature/\*

Se utilizará para desarrollar funcionalidades.

Ejemplo:

```text
feature/HU-01-login
```

### chore/\*

Se utilizará para tareas técnicas, configuración o infraestructura.

Ejemplo:

```text
chore/devops-quality-baseline
```

### fix/\*

Se utilizará para correcciones específicas.

---

## 5. Pull Requests

La integración se realizará mediante Pull Requests.

Flujo:

```text
Rama de trabajo
      ↓
Commit
      ↓
Push
      ↓
Pull Request
      ↓
CI / Security
      ↓
Revisión
      ↓
Merge
```

Cuando corresponda, el Pull Request deberá relacionarse con la Issue asociada.

---

## 6. BUILD

Cada cambio deberá comprobar que la aplicación puede construirse correctamente.

Proceso previsto:

```text
Checkout
 ↓
Node.js
 ↓
npm ci
 ↓
Angular/Ionic Build
```

Comando base:

```bash
npm run build
```

Un fallo de compilación bloqueará la integración.

---

## 7. TEST

La etapa TEST ejecutará progresivamente:

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
```

El plan detallado de pruebas se encuentra en:

```text
docs/testing/TEST_PLAN.md
```

La trazabilidad de pruebas se encuentra en:

```text
docs/testing/TRACEABILITY_MATRIX.md
```

---

## 8. SECURITY

La etapa SECURITY incluirá progresivamente:

- análisis de dependencias;
- análisis estático;
- control de secretos;
- pruebas PS-HUXX-\*;
- revisión de criterios de seguridad.

Los criterios transversales se encuentran definidos en:

```text
docs/security/SECURITY_CRITERIA.md
```

---

## 9. Integración continua

GitHub Actions será la plataforma de automatización.

Flujo previsto:

```text
Pull Request
     ↓
Checkout
     ↓
Configurar Node
     ↓
npm ci
     ↓
Lint
     ↓
Tests
     ↓
Coverage
     ↓
Security Checks
     ↓
Build
```

Un fallo en un control obligatorio deberá corregirse antes del merge.

---

## 10. Workflow de CI

Archivo previsto:

```text
.github/workflows/ci.yml
```

Responsabilidades:

- instalar dependencias;
- ejecutar lint;
- ejecutar pruebas;
- obtener cobertura;
- construir la aplicación.

Relacionado con:

```text
TT-43 | Implementar pipeline CI de calidad
```

---

## 11. Workflow de seguridad

Archivo previsto:

```text
.github/workflows/security.yml
```

Responsabilidades:

- revisar dependencias;
- ejecutar análisis estático;
- detectar vulnerabilidades;
- apoyar el control de seguridad.

Relacionado con:

```text
TT-45 | Implementar pipeline de análisis de seguridad
```

---

## 12. Workflow Android

Archivo previsto:

```text
.github/workflows/android-build.yml
```

Flujo:

```text
npm ci
 ↓
npm run build
 ↓
npx cap sync android
 ↓
Configurar Java
 ↓
Gradle
 ↓
assembleDebug
 ↓
APK
```

Relacionado con:

```text
TT-46 | Automatizar compilación Android
```

---

## 13. Development

Ramas:

```text
feature/*
chore/*
fix/*
```

Propósito:

Desarrollo individual antes de la integración.

---

## 14. Integration

Rama:

```text
develop
```

Propósito:

Integración del trabajo aprobado del equipo.

---

## 15. Staging

El entorno de staging utilizará inicialmente:

```text
develop
+
GitHub Actions
+
APK de prueba
```

Flujo:

```text
develop
 ↓
CI
 ↓
Security
 ↓
Android Build
 ↓
APK
 ↓
Pruebas
```

Relacionado con:

```text
TT-47 | Implementar entrega de APK de staging
```

---

## 16. Production

Rama:

```text
main
```

Representará versiones estables y aprobadas.

La publicación en Google Play u otra tienda solamente será considerada implementada cuando existan:

- cuenta correspondiente;
- credenciales;
- firma;
- configuración;
- permisos necesarios.

Hasta entonces, el despliegue automatizado se limitará a los artefactos Android del entorno de staging o release.

---

## 17. RELEASE

Una versión podrá pasar a RELEASE cuando:

- el build sea exitoso;
- CI sea satisfactorio;
- las pruebas obligatorias pasen;
- no existan defectos bloqueantes;
- los controles de seguridad requeridos sean satisfactorios;
- exista evidencia verificable.

Los productos verificables PV-01 a PV-05 representan incrementos planificados del proyecto.

---

## 18. Versionado

Cuando el proceso se encuentre estable podrán utilizarse etiquetas Git.

Ejemplos:

```text
v0.1.0
v0.2.0
v1.0.0
```

---

## 19. DEPLOY

Inicialmente DEPLOY representará la distribución del APK de staging para pruebas.

```text
GitHub Actions
     ↓
APK
     ↓
Artifact
     ↓
Equipo
     ↓
Pruebas
```

Esta etapa no equivale todavía a una publicación automática en Google Play.

---

## 20. MONITOR

Durante la etapa académica se supervisarán:

- ejecuciones de GitHub Actions;
- errores de CI;
- errores reportados;
- fallos de pruebas;
- vulnerabilidades;
- incidencias registradas mediante GitHub Issues.

En una etapa posterior podrán incorporarse herramientas específicas de observabilidad.

---

## 21. Flujo completo

```text
GitHub Project
      ↓
Issue
      ↓
feature/* / chore/*
      ↓
Commit
      ↓
Push
      ↓
Pull Request
      ↓
┌─────────────────┐
│ Lint            │
│ Tests           │
│ Coverage        │
│ Security        │
│ Build           │
└─────────────────┘
      ↓
develop
      ↓
Android Build
      ↓
APK Staging
      ↓
Validación
      ↓
main
      ↓
Tag / Release
```

---

## 22. Criterios para merge

Un Pull Request podrá integrarse cuando:

- compile correctamente;
- no tenga errores obligatorios de lint;
- las pruebas automatizadas requeridas pasen;
- los controles de seguridad obligatorios pasen;
- esté relacionado con el trabajo planificado;
- no contenga secretos;
- haya sido revisado cuando corresponda.

---

## 23. Manejo de fallos

Si un pipeline falla:

```text
Pull Request
      ↓
Check fallido
      ↓
Corrección en la rama
      ↓
Nuevo commit
      ↓
Nueva ejecución automática
```

No deberá corregirse un fallo mediante cambios directos en `main`.

---

## 24. Artefactos

Los pipelines podrán producir:

- resultados de pruebas;
- reportes de cobertura;
- logs;
- APK debug o staging;
- evidencia de compilación.

Los artefactos deberán poder reproducirse desde el código versionado.

---

## 25. Protección de ramas

Se utilizará progresivamente protección sobre:

```text
develop
main
```

Los checks obligatorios se activarán después de implementar y estabilizar los workflows.

Esto evita bloquear el repositorio con pipelines todavía incompletos.

---

## 26. Secretos de CI/CD

Los secretos utilizados por pipelines deberán almacenarse mediante mecanismos seguros de GitHub.

No deberán escribirse directamente en:

- código;
- workflows;
- README;
- commits;
- logs.

---

## 27. Relación con GitHub Project

Las tareas relacionadas con este plan incluyen:

```text
TT-42 | Definir Plan de Pruebas y matriz de trazabilidad
TT-43 | Implementar pipeline CI de calidad
TT-44 | Automatizar pruebas unitarias e integración con cobertura
TT-45 | Implementar pipeline de análisis de seguridad
TT-46 | Automatizar compilación Android
TT-47 | Implementar entrega de APK de staging
TT-48 | Implementar pruebas funcionales y regresión
TT-49 | Ejecutar y documentar pruebas de seguridad
TT-50 | Documentar CI/CD, pruebas y evidencias
```

---

## 28. Evidencias

Se conservarán como evidencia:

- capturas de GitHub Project;
- Issues;
- Pull Requests;
- ejecuciones de GitHub Actions;
- resultados de pruebas;
- resultados de análisis de seguridad;
- reportes de cobertura;
- APK generados;
- commits;
- releases cuando correspondan.

---

## 29. Estado actual del baseline

Al momento de crear este documento:

- GitHub Project está configurado.
- Existen HU-01 a HU-14.
- Existen TT-01 a TT-50.
- Existen PV-01 a PV-05.
- Existen las ramas `main` y `develop`.
- Se utiliza `chore/devops-quality-baseline` para preparar esta infraestructura.
- Los workflows automáticos todavía deberán implementarse.

---

## 30. Evolución prevista

El proceso evolucionará desde:

```text
Build manual
+
Pruebas principalmente manuales
```

hacia:

```text
CI automatizado
+
Pruebas automatizadas
+
Security checks
+
Android build
+
APK de staging
+
Release controlado
```

---

## 31. Referencias internas

- `../testing/TEST_PLAN.md`
- `../testing/TRACEABILITY_MATRIX.md`
- `../security/SECURITY_CRITERIA.md`
- GitHub Project Casa de Música Castillo - App Móvil
