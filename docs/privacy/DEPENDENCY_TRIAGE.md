# Clasificación de dependencias — Etapa 2B

3 de noviembre de 2026, mismo lockfile de partida que 2A. npm audit inicial confirma 29 paquetes afectados: 2 críticos, 2 altos, 24 moderados y 1 bajo. Son nodos/propagaciones del árbol, no 29 CVE independientes. Runtime audit omit=dev: cero antes/después. El audit no demuestra por sí solo explotación ni ausencia de todo riesgo.

## Remediación dirigida comprobable

- Vitest y coverage-v8 se mantienen alineados en 4.1.12; eliminan avisos críticos/inherentes del runner y mocker. El aviso crítico requería servidor Vitest UI escuchando; nuestros comandos CI son no interactivos, pero se corrige la dependencia en lugar de ignorarla.
- @angular/build pasa de 22.2.1 a 22.2.5, compatible con core/compiler 22.2.1 y TypeScript 6 según sus peers; actualiza su Vite a 8.3.5. Vitest nuevo resuelve Vite corregido. No se migra Ionic/Capacitor ni se actualiza todo Angular.
- source-map-js se actualiza en lock dentro de rangos admitidos a 1.2.2. No hay overrides que fuercen APIs incompatibles ni npm audit fix --force/legacy-peer-deps.
- npm 11.1.0 local falló en Arborist edgesOut al resolver el grafo antiguo; se usó CLI oficial npm 11.6.2 solo desde caché temporal para resolver, seguido de normalización con npm local y npm ci normal satisfactorio. No se cambia npm global ni el comando CI.

Resultado del lock instalado: **23 moderadas, 0 altas, 0 críticas, 0 bajas; runtime 0**. CI conserva audit runtime moderate y añade control obligatorio del árbol completo a nivel high; el audit completo moderate continúa informativo. No se debilita ningún control ni se confunde informativo con PASS global de vulnerabilidades.

El runner actualizado detectó dos rechazos sin manejar en fixtures antiguos con rutas vacías: redirección a login de petición sin sesión y retorno después de editar perfil DEMO. Se completaron sus dobles de navegación con Promises resueltas y aserciones del destino esperado, como ya hacían otros casos de esas suites. No se cambia lógica productiva ni se ignoran errores del runner.

## Clasificación de las 29 entradas originales

| Paquete | Inicial | Alcance | Después | Aviso o dependencia causante |
|---|---|---|---|---|
| `@vitest/coverage-v8` | critical | directa dev | sin alerta reportada | `vitest` |
| `vitest` | critical | directa dev | sin alerta reportada | `@vitest/mocker`, [aviso](https://github.com/advisories/GHSA-5xrq-8626-4rwp), [aviso](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) |
| `source-map-js` | high | transitiva dev | sin alerta reportada | [aviso](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) |
| `vite` | high | transitiva dev | sin alerta reportada | [aviso](https://github.com/advisories/GHSA-698v-4r3x-3vcv), [aviso](https://github.com/advisories/GHSA-r825-w8mm-5pxw), [aviso](https://github.com/advisories/GHSA-587h-7wmj-h5pm), [aviso](https://github.com/advisories/GHSA-9jrq-w75r-8gcw), [aviso](https://github.com/advisories/GHSA-rq7h-c2jc-7f22), [aviso](https://github.com/advisories/GHSA-vfpm-58rq-9qcg) |
| `@angular-eslint/builder` | moderate | transitiva dev | moderate | `eslint` |
| `@angular-eslint/eslint-plugin` | moderate | transitiva dev | moderate | `@angular-eslint/utils`, `@typescript-eslint/utils`, `eslint` |
| `@angular-eslint/eslint-plugin-template` | moderate | transitiva dev | moderate | `@angular-eslint/template-parser`, `@angular-eslint/utils`, `@typescript-eslint/utils`, `eslint` |
| `@angular-eslint/schematics` | moderate | transitiva dev | moderate | `@angular-eslint/eslint-plugin`, `@angular-eslint/eslint-plugin-template` |
| `@angular-eslint/template-parser` | moderate | transitiva dev | moderate | `eslint` |
| `@angular-eslint/utils` | moderate | transitiva dev | moderate | `@typescript-eslint/utils`, `eslint` |
| `@capacitor/cli` | moderate | directa dev | moderate | `xcode` |
| `@eslint-community/eslint-utils` | moderate | transitiva dev | moderate | `eslint` |
| `@eslint/config-array` | moderate | transitiva dev | moderate | `minimatch` |
| `@typescript-eslint/eslint-plugin` | moderate | transitiva dev | moderate | `@typescript-eslint/parser`, `@typescript-eslint/type-utils`, `@typescript-eslint/utils`, `eslint` |
| `@typescript-eslint/parser` | moderate | transitiva dev | moderate | `@typescript-eslint/typescript-estree`, `eslint` |
| `@typescript-eslint/type-utils` | moderate | transitiva dev | moderate | `@typescript-eslint/typescript-estree`, `@typescript-eslint/utils`, `eslint` |
| `@typescript-eslint/typescript-estree` | moderate | transitiva dev | moderate | `minimatch` |
| `@typescript-eslint/utils` | moderate | transitiva dev | moderate | `@eslint-community/eslint-utils`, `@typescript-eslint/typescript-estree`, `eslint` |
| `@vitest/mocker` | moderate | transitiva dev | sin alerta reportada | [aviso](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [aviso](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) |
| `angular-eslint` | moderate | directa dev | moderate | `@angular-eslint/builder`, `@angular-eslint/eslint-plugin`, `@angular-eslint/eslint-plugin-template`, `@angular-eslint/schematics`, `@angular-eslint/template-parser`, `@typescript-eslint/utils`, `eslint` |
| `eslint` | moderate | directa dev | moderate | `@eslint-community/eslint-utils`, `@eslint/config-array`, `minimatch` |
| `fast-uri` | moderate | transitiva dev | moderate | [aviso](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), [aviso](https://github.com/advisories/GHSA-xhq7-xmqj-769h), [aviso](https://github.com/advisories/GHSA-wjr9-j795-jxcr), [aviso](https://github.com/advisories/GHSA-333x-w4r6-6crp) |
| `glob` | moderate | transitiva dev | moderate | [aviso](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), `minimatch` |
| `minimatch` | moderate | transitiva dev | moderate | [aviso](https://github.com/advisories/GHSA-g3hv-75wg-m249) |
| `rimraf` | moderate | transitiva dev | moderate | `glob` |
| `typescript-eslint` | moderate | directa dev | moderate | `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@typescript-eslint/typescript-estree`, `@typescript-eslint/utils`, `eslint` |
| `uuid` | moderate | transitiva dev | moderate | [aviso](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |
| `xcode` | moderate | transitiva dev | moderate | `uuid` |
| `@angular/build` | low | directa dev | sin alerta reportada | `vite` |

## Trabajo independiente pendiente

Las 23 moderadas restantes afectan toolchain ESLint/angular-eslint/typescript-eslint (patrones/glob/minimatch/fast-uri) y Capacitor CLI/xcode/uuid/rimraf. No están en el bundle runtime según npm omit=dev, pero procesan archivos/configuración potencialmente no confiables: mantener servidores locales sin exposición y revisar entradas/PR antes de ejecutar herramientas. No tratar el resultado como excepción permanente.

Preparar un incremento independiente de remediación, relacionado con TT-45 #64: estudiar versiones corregidas y peers de ESLint 10/angular-eslint 22/TypeScript 6 y Capacitor 8, actualizar por familias en commits separados, evitar overrides mayores a ciegas, conservar reglas de lint/umbrales y ejecutar npm ci, audit completo/runtime, lint, general/cobertura, HTTP controlado, regresión/caja blanca, builds Development/Production/DEMO, sync y Android Debug/Release/R8 y Maestro. Revalidar avisos contra registry en la fecha de esa intervención. No se marca Done mientras sigan afectadas ni se asigna trabajo a otros responsables.
