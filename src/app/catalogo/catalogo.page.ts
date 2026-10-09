
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent
} from '@ionic/angular';

type Categoria =
  'Todos' | 'Guitarras' | 'Teclados' |
  'Percusión' | 'Cuerdas' | 'Audio';

type Orden = 'destacados' | 'precioAsc' |
  'precioDesc' | 'nombre';

interface Producto {
  id: number;
  nombre: string;
  marca: string;
  categoria: Exclude<Categoria, 'Todos'>;
  precio: number;
  icono: string;
  fondo: string;
  descripcion: string;
}

@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.page.html',
  styleUrls: ['./catalogo.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent
  ]
})
export class CatalogoPage {
  busqueda = '';
  categoriaActiva: Categoria = 'Todos';
  orden: Orden = 'destacados';
  seleccionado: Producto | null = null;

  categorias: Categoria[] = [
    'Todos', 'Guitarras', 'Teclados',
    'Percusión', 'Cuerdas', 'Audio'
  ];

  // Datos ficticios exclusivamente para demostrar la interfaz.
  // Sustituiremos este arreglo por la API del backend.
  productos: Producto[] = [
    {
      id: 1,
      nombre: 'Guitarra acústica',
      marca: 'Instrumentos de cuerda',
      categoria: 'Guitarras',
      precio: 2490,
      icono: '🎸',
      fondo: 'vino',
      descripcion: 'Guitarra acústica para estudio y práctica.'
    },
    {
      id: 2,
      nombre: 'Teclado de 61 teclas',
      marca: 'Instrumentos electrónicos',
      categoria: 'Teclados',
      precio: 3950,
      icono: '🎹',
      fondo: 'dorado',
      descripcion: 'Teclado musical para aprender y practicar.'
    },
    {
      id: 3,
      nombre: 'Batería acústica',
      marca: 'Instrumentos de percusión',
      categoria: 'Percusión',
      precio: 8950,
      icono: '🥁',
      fondo: 'azul',
      descripcion: 'Batería de demostración para distintos estilos.'
    },
    {
      id: 4,
      nombre: 'Violín de estudio',
      marca: 'Instrumentos de cuerda',
      categoria: 'Cuerdas',
      precio: 1850,
      icono: '🎻',
      fondo: 'crema',
      descripcion: 'Violín pensado para estudiantes principiantes.'
    },
    {
      id: 5,
      nombre: 'Guitarra eléctrica',
      marca: 'Instrumentos de cuerda',
      categoria: 'Guitarras',
      precio: 5690,
      icono: '🎸',
      fondo: 'azul',
      descripcion: 'Guitarra eléctrica de demostración.'
    },
    {
      id: 6,
      nombre: 'Micrófono vocal',
      marca: 'Equipo de audio',
      categoria: 'Audio',
      precio: 1290,
      icono: '🎤',
      fondo: 'vino',
      descripcion: 'Micrófono para canto y presentaciones.'
    },
    {
      id: 7,
      nombre: 'Bajo eléctrico',
      marca: 'Instrumentos de cuerda',
      categoria: 'Cuerdas',
      precio: 4790,
      icono: '🎸',
      fondo: 'dorado',
      descripcion: 'Bajo eléctrico para prácticas musicales.'
    },
    {
      id: 8,
      nombre: 'Teclado compacto',
      marca: 'Instrumentos electrónicos',
      categoria: 'Teclados',
      precio: 2250,
      icono: '🎹',
      fondo: 'crema',
      descripcion: 'Teclado portátil para estudiantes.'
    }
  ];

  get productosFiltrados(): Producto[] {
    const texto = this.busqueda.trim().toLowerCase();

    const filtrados = this.productos.filter(producto => {
      const coincideCategoria =
        this.categoriaActiva === 'Todos' ||
        producto.categoria === this.categoriaActiva;

      const contenido = (
        producto.nombre + ' ' +
        producto.marca + ' ' +
        producto.categoria
      ).toLowerCase();

      return coincideCategoria && contenido.includes(texto);
    });

    switch (this.orden) {
      case 'precioAsc':
        return filtrados.sort((a, b) => a.precio - b.precio);
      case 'precioDesc':
        return filtrados.sort((a, b) => b.precio - a.precio);
      case 'nombre':
        return filtrados.sort(
          (a, b) => a.nombre.localeCompare(b.nombre)
        );
      default:
        return filtrados;
    }
  }

  seleccionarCategoria(categoria: Categoria): void {
    this.categoriaActiva = categoria;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.categoriaActiva = 'Todos';
    this.orden = 'destacados';
  }

  mostrarDetalle(producto: Producto): void {
    this.seleccionado = producto;
  }

  cerrarDetalle(): void {
    this.seleccionado = null;
  }

  identificarProducto(_index: number, producto: Producto): number {
    return producto.id;
  }
}
