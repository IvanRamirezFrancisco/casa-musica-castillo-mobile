# Diagnóstico UI adaptativa

Base 89d73285c8e363f4dad84e082718f2ed7ef32e2e, Draft #88. Develop efe9767 y cadena #83, #84, #85, #87 y #88 abiertos. #88 tenía 18 checks aprobados y 5 condicionales omitidos. La revisión [de Brayan](https://github.com/IvanRamirezFrancisco/casa-musica-castillo-mobile/pull/83#pullrequestreview-5780884123) documenta 375×667. Los adjuntos devolvieron error de acceso en esta sesión. #83 → #88 conserva navegación y catálogo, incorpora privacidad y adapta formularios y mensajes de autenticación y perfil.

Ionic usa ion-tabs y ion-content. Los tokens y safe areas se definen en src/theme/variables.scss, el layout general en src/global.scss, el comercio y los formularios en SCSS compartido y las composiciones en cada vista. La marca conserva #722F37, dorado, Montserrat y Roboto.

| Pantalla / componente | Observación | Tamaño | Causa | Prioridad | Solución | Prueba / riesgo |
|---|---|---|---|---|---|---|
| Detalle conectado | 1.3 sin unidad | Todos | Interpolación de número sin formato | Alta | Formato es-MX en kg según PublicProductDTO del backend | HTTP controlado, valor cero, precisión y null. Bajo |
| Inicio, Catálogo, Carrito, Pedidos y Perfil / Bubble Navigation | Brayan observa oclusión en #83. En #88 el scroller aún se extiende bajo una barra fixed | 375×667, zoom, teclado y cualquier altura con barra | Reserva duplicada, depende de clases de cada vista y de dimensiones fijas | Alta | Hacer que el footer de Ionic consuma altura real, con inset separado | Comparar límites geométricos y scroll final. Riesgo medio para navegación |
| Catálogo y home / grid y skeleton | Un único resultado puede ocupar todo el ancho a tamaños intermedios. Grid y placeholder usan reglas distintas | Teléfono a tablet | auto-fit colapsa pistas y skeleton usa otra fórmula | Media | Compartir grid adaptable y conservar proporción de tarjeta | Matriz con títulos largos y productos escasos. Bajo |
| Filtros / modal | Sheet 85 % y dos columnas rígidas de acciones | 320 px, horizontal, texto grande | Layout de acciones depende del ancho disponible | Media | Dialog centrado en ancho amplio mediante CSS, botones envolventes y contenido desplazable | Abrir, cerrar con Escape, foco de retorno. Medio |
| Detalle / especificaciones, galería y compra | Columnas de especificaciones rígidas y cubierta alta en paisaje. Fila de cantidad no envuelve | Estrecho, horizontal y plegable abierto | Medidas fijas y breakpoint de 768 px | Media | Columnas según espacio, wrapping y cubierta acotada por viewport | Casos de ancho y zoom, stock y precio visibles. Bajo |
| Login, registro, verificación, recuperación, MFA / auth-shell | El padding de tarjeta y héroe consume espacio de escritura y altura con teclado | 320 px y ventanas bajas | Padding y espaciado fijo | Media | Ajuste fluido y reducir separación en ventana baja. Conservar validadores, mensajes y foco | Formulario largo, reducción de altura y reflow. Bajo |
| README / TT-03 | Falta entrada directa a conexión y puerto 4200 | Documentación | Guía aislada | Media | Enlace, comandos y diagnóstico de CORS | Revisión de contrato y comandos. Bajo |

Inventario de rutas inspeccionadas. Splash y estados de interfaz son locales. Inicio, categorías, catálogo, búsqueda, filtros, detalle y reseñas tienen camino HTTP con sus reglas. Login, registro, verificación, recuperación y MFA conservan los flujos conectados. Favoritos, carrito, pedidos, detalle de pedido, perfil, privacidad de cuenta y seguridad conservan sus guards y contratos. Checkout y edición de perfil conservan sus restricciones, con edición local únicamente en DEMO. Privacidad informativa, carga, estados vacíos, error y diagnóstico de conexión mantienen sus componentes. Las variantes DEMO son explícitas. El inventario no acredita ejecución de todas las rutas ni aceptación física.

Estrategia adaptativa. No se añade rail ni una segunda navegación. El catálogo conserva los filtros compatibles y su estado de URL. Los anchos abiertos y tablets usan el espacio para columnas y detalle. Los formularios mantienen su ancho de lectura. El diseño responde al viewport sin detectar modelos ni depender de segmentos de bisagra. Referencias [Ionic](https://ionicframework.com/docs/api/content) y [WCAG 2.2](https://www.w3.org/TR/WCAG22/).


## Evidencia y reproducción

En 375×667, sobre la base #88 el scroller llegaba a y=667 y la cápsula empezaba en y=591. El último botón de paginación era visible al llegar al final. En el incremento, el scroller termina en y=583, la cápsula sigue en y=591 y el botón queda dentro del scroller. El mismo layout reserva espacio para inicio, carrito, pedidos y perfil. La barra toma su altura del contenido y conserva las rutas y los iconos. El DTO del backend documenta kg y la vista formatea con Intl.NumberFormat es-MX. Las pruebas cubren 1.3, cero, precisión decimal y ausencia del dato.

La matriz usa Node 22 y Chrome con DevTools. Desde la raíz ejecutar en terminales separadas:

```powershell
npm start -- --configuration development --host 127.0.0.1 --port 4291
node test/responsive-ui.mjs
```

Si Chrome está en otra ruta, indicar el ejecutable con CMC_CHROME. Los JSON y las capturas quedan en reports/uiux/after. Para la línea base se ejecutó el mismo recorrido en modo --baseline con el código original y sin imagen sintética. El arnés intercepta la API con fixtures exclusivos de prueba, bloquea solicitudes externas y sirve una imagen sintética de 160×80 para comprobar object-fit. Nunca se usa como backend de la app.

Se observaron inicio, catálogo, filtros, detalle, login, registro, carrito, pedidos, perfil y privacidad en 320×640, 360×640, 375×667, 390×844, 412×915, 344×882, 690×829, 768×1024, 820×1180, 1024×1366, 1280×800, 1024×768 y 667×375. Se comprobaron el scroll final, objetivos de navegación de al menos 44 px de ancho, ausencia de desbordamiento horizontal, Escape con retorno al botón de filtros, búsqueda conservada al pasar de 344 a 690 px, insets simulados y registro al 200 % en ventana baja. Los pedidos y el carrito usan estados vacíos de prueba. El catálogo pasó de una columna a tres al abrir el viewport plegable simulado y a cuatro en la ventana de 1280 px. El detalle usa dos columnas cuando el contenido dispone de ancho suficiente.

Contraste calculado para pares representativos de tokens. Blanco sobre burdeos 9.65:1, texto secundario sobre blanco 5.74:1 y sobre superficie alterna 5.03:1, texto oscuro sobre dorado 6.10:1. Se conservaron foco visible, reducción de movimiento y etiquetas de controles. Queda por ejecutar aceptación física con TalkBack, teclado IME, Atrás nativo, escala de fuente del sistema, cambios de postura y multiventana en Android.

ESLint y las suites locales aprobaron. Suite general 756 pruebas y cobertura de líneas 97.93 %, integración HTTP controlada 198 y regresión 189. Las suites se solapan. La paginación HTTP, la carga de imágenes y los estados de datos se conservan. Grid y skeleton comparten distribución, sin añadir librerías ni observadores de layout. El build local Production generó 713.97 kB iniciales y estimó 174.24 kB de transferencia. Persisten advertencias de budgets SCSS. No se midió CLS de campo, memoria ni velocidad en un dispositivo físico.

La auditoría del lockfile reportó cero vulnerabilidades de producción y 20 moderadas en el árbol completo de herramientas, sin altas ni críticas. Entre las dependencias directas afectadas figuran Angular ESLint, ESLint, TypeScript ESLint y Capacitor CLI. El lockfile se conserva. Los datos de CI y los paquetes del SHA final se consultan en el Draft.

Referencias de trabajo en el Project. #18 (TT-04), #5, #6, #7, #35, #36 y #43 para catálogo, navegación y detalle. #61, #63, #65, #67 y #69 para pruebas y evidencia. Propuesta para revisión de planeación: agregar a la matriz #61 una ejecución física con Galaxy A55, plegable y tablet, incluyendo TalkBack e IME. Evaluar con el equipo si ese alcance requiere una TT específica.

Las correcciones pertenecen al incremento apilado sobre #88. Para integrarlas se requiere revisar la cadena #83 → #84 → #85 → #87 → #88 y este Draft en orden, recalculando el diff y comprobando los controles tras actualizar cada base. Los recorridos DEMO siguen diferenciados. Checkout comercial y edición remota de perfil conservan sus restricciones y dependen de los contratos ya documentados.
