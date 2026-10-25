export type CatalogCategory =
  | 'Todos'
  | 'Guitarras'
  | 'Teclados'
  | 'Percusión'
  | 'Cuerdas'
  | 'Audio';

export type CatalogSort =
  | 'destacados'
  | 'precioAsc'
  | 'precioDesc'
  | 'nombre';

export interface CatalogProduct {
  readonly id: number;
  readonly nombre: string;
  readonly marca: string;
  readonly categoria: Exclude<CatalogCategory, 'Todos'>;
  readonly precio: number;
  readonly descripcion: string;
  readonly icono: string;
}

// Datos provisionales compartidos; sin acceso a API ni persistencia.
export const CATALOG_DEMO_PRODUCTS: readonly CatalogProduct[] = [
    {
      id: 1,
      nombre: 'Guitarra acústica de estudio',
      marca: 'Yamaha Classic',
      categoria: 'Guitarras',
      precio: 2490,
      icono: 'musical-note-outline',
      descripcion: 'Guitarra acústica ideal para estudio y práctica, con acabado brillante y cuerdas de nylon.',
    },
    {
      id: 2,
      nombre: 'Teclado de 61 teclas sensitivo',
      marca: 'Roland Go Series',
      categoria: 'Teclados',
      precio: 3950,
      icono: 'keypad-outline',
      descripcion: 'Teclado musical portátil con respuesta táctil y banco de sonidos polifónicos.',
    },
    {
      id: 3,
      nombre: 'Batería acústica para escenario',
      marca: 'Pearl Export Standard',
      categoria: 'Percusión',
      precio: 8950,
      icono: 'ellipse-outline',
      descripcion: 'Set completo de batería para diversos géneros musicales con herrajes reforzados.',
    },
    {
      id: 4,
      nombre: 'Violín de estudio con estuche',
      marca: 'Stentor Student',
      categoria: 'Cuerdas',
      precio: 1850,
      icono: 'pulse-outline',
      descripcion: 'Violín diseñado para estudiantes y conservatorio, incluye arco de crin y estuche térmico.',
    },
    {
      id: 5,
      nombre: 'Guitarra eléctrica sólida',
      marca: 'Ibanez Gio Edition',
      categoria: 'Guitarras',
      precio: 5690,
      icono: 'musical-note-outline',
      descripcion: 'Guitarra eléctrica de cuerpo sólido con pastillas Humbucker para sonido potente.',
    },
    {
      id: 6,
      nombre: 'Micrófono vocal dinámico',
      marca: 'Shure Vocal Art',
      categoria: 'Audio',
      precio: 1290,
      icono: 'mic-outline',
      descripcion: 'Micrófono cardioide para voz en vivo y presentaciones con excelente claridad.',
    },
    {
      id: 7,
      nombre: 'Bajo eléctrico de 4 cuerdas',
      marca: 'Fender Squier Precision',
      categoria: 'Cuerdas',
      precio: 4790,
      icono: 'pulse-outline',
      descripcion: 'Bajo eléctrico clásico de 4 cuerdas para líneas de bajo definidas y profundas.',
    },
    {
      id: 8,
      nombre: 'Teclado sintetizador compacto',
      marca: 'Korg Micro Series',
      categoria: 'Teclados',
      precio: 2250,
      icono: 'keypad-outline',
      descripcion: 'Sintetizador portátil con mini teclas de alta sensibilidad y filtros analógicos.',
    },
  ];
