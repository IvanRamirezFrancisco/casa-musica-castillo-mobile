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
