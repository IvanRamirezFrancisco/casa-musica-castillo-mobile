import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, signal, viewChild } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonContent, IonHeader, IonIcon, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  closeOutline,
  ellipseOutline,
  imageOutline,
  keypadOutline,
  micOutline,
  musicalNoteOutline,
  musicalNotesOutline,
  pulseOutline,
  searchOutline,
} from 'ionicons/icons';
import { CmcEmptyStateComponent } from '../../shared/ui/empty-state/cmc-empty-state.component';

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

@Component({
  selector: 'app-catalog',
  templateUrl: './catalog.page.html',
  styleUrls: ['./catalog.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    IonContent,
    IonHeader,
    IonToolbar,
    IonIcon,
    CmcEmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {
  private readonly route = inject(ActivatedRoute);
  readonly busqueda = signal('');
  readonly categoriaActiva = signal<CatalogCategory>('Todos');
  readonly orden = signal<CatalogSort>('destacados');
  readonly seleccionado = signal<CatalogProduct | null>(null);

  readonly categorias: readonly CatalogCategory[] = [
    'Todos',
    'Guitarras',
    'Teclados',
    'Percusión',
    'Cuerdas',
    'Audio',
  ];

  // Catálogo demostrativo provisional - se reemplazará por la API REST
  readonly productos: readonly CatalogProduct[] = [
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

  readonly productosFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const cat = this.categoriaActiva();

    const filtrados = this.productos.filter((producto) => {
      const coincideCategoria = cat === 'Todos' || producto.categoria === cat;
      if (!coincideCategoria) {
        return false;
      }

      if (!texto) {
        return true;
      }

      const contenido = `${producto.nombre} ${producto.marca} ${producto.categoria}`.toLowerCase();
      return contenido.includes(texto);
    });

    const copia = [...filtrados];
    switch (this.orden()) {
      case 'precioAsc':
        return copia.sort((a, b) => a.precio - b.precio);
      case 'precioDesc':
        return copia.sort((a, b) => b.precio - a.precio);
      case 'nombre':
        return copia.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
      default:
        return copia;
    }
  });

  private readonly detailDialog = viewChild<ElementRef<HTMLDialogElement>>('detailDialog');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.busqueda.set(params.get('q') ?? '');
    });
    effect(() => {
      const dialog = this.detailDialog()?.nativeElement;
      if (dialog && !dialog.open) {
        dialog.showModal();
      }
    });
    addIcons({
      searchOutline,
      closeOutline,
      musicalNotesOutline,
      musicalNoteOutline,
      keypadOutline,
      ellipseOutline,
      pulseOutline,
      micOutline,
      imageOutline,
      chevronForwardOutline,
    });
  }

  onBusquedaChange(valor: string): void {
    this.busqueda.set(valor);
  }

  seleccionarCategoria(categoria: CatalogCategory): void {
    this.categoriaActiva.set(categoria);
  }

  onOrdenChange(nuevoOrden: CatalogSort): void {
    this.orden.set(nuevoOrden);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.categoriaActiva.set('Todos');
    this.orden.set('destacados');
  }

  mostrarDetalle(producto: CatalogProduct): void {
    this.seleccionado.set(producto);
  }

  cerrarDetalle(): void {
    this.detailDialog()?.nativeElement.close();
    this.seleccionado.set(null);
  }
  onDialogClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      const dialog = this.detailDialog()?.nativeElement;
      const bounds = dialog?.getBoundingClientRect();
      if (bounds && (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom)) {
        this.cerrarDetalle();
      }
    }
  }

  ionViewWillLeave(): void {
    this.cerrarDetalle();
  }
}
