import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { CATALOG_DEMO_PRODUCTS, CatalogCategory, CatalogSort } from './catalog-demo.data';
import { CmcEmptyStateComponent } from '../../shared/ui/empty-state/cmc-empty-state.component';

@Component({
  selector: 'app-catalog',
  templateUrl: './catalog.page.html',
  styleUrls: ['./catalog.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
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
  private readonly router = inject(Router);
  readonly busqueda = signal('');
  readonly categoriaActiva = signal<CatalogCategory>('Todos');
  readonly orden = signal<CatalogSort>('destacados');

  readonly categorias: readonly CatalogCategory[] = [
    'Todos',
    'Guitarras',
    'Teclados',
    'Percusión',
    'Cuerdas',
    'Audio',
  ];

  readonly productos = CATALOG_DEMO_PRODUCTS;

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

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.busqueda.set(params.get('q') ?? '');
      // TT-21: Inicio puede abrir el catálogo filtrado (?categoria=Guitarras).
      // Solo se aceptan categorías conocidas; cualquier otro valor se ignora.
      const categoria = params.get('categoria');
      this.categoriaActiva.set(this.esCategoriaValida(categoria) ? categoria : 'Todos');
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

  private esCategoriaValida(valor: string | null): valor is CatalogCategory {
    return valor !== null && (this.categorias as readonly string[]).includes(valor);
  }

  onBusquedaChange(valor: string): void {
    this.busqueda.set(valor);
    this.syncFilters();
  }

  seleccionarCategoria(categoria: CatalogCategory): void {
    this.categoriaActiva.set(categoria);
    this.syncFilters();
  }

  onOrdenChange(nuevoOrden: CatalogSort): void {
    this.orden.set(nuevoOrden);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.categoriaActiva.set('Todos');
    this.orden.set('destacados');
    this.syncFilters();
  }

  private syncFilters(): void {
    // Only public filters; replace prevents a history entry per keystroke.
    void this.router.navigate(['/main/catalog'], {
      queryParams: {
        q: this.busqueda() || null,
        categoria: this.categoriaActiva() === 'Todos' ? null : this.categoriaActiva(),
      },
      replaceUrl: true,
    });
  }
}
