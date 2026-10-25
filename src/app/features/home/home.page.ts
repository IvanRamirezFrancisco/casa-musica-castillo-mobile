import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonToolbar,   IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline, notificationsOutline, musicalNoteOutline, keypadOutline, ellipseOutline, pulseOutline, micOutline, heartOutline, imageOutline, musicalNotesOutline } from 'ionicons/icons';
import type { CatalogCategory } from '../catalog/catalog-demo.data';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
}

// Las categorías de Inicio usan los mismos valores que el filtro del Catálogo
// para que la navegación (TT-21) abra el catálogo ya filtrado.
interface Category {
  id: string;
  name: Exclude<CatalogCategory, 'Todos'>;
  icon: string;
}

import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,


    IonIcon,
    RouterLink,
    CurrencyPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly router = inject(Router);
  readonly searchTerm = signal('');

  updateSearch(event: Event): void {
    if (event.target instanceof HTMLInputElement) { this.searchTerm.set(event.target.value); }
  }

  searchCatalog(): void {
    void this.router.navigate(['/main/catalog'], { queryParams: { q: this.searchTerm() } });
  }

  readonly favorites = signal<readonly string[]>([]);

  toggleFavorite(id: string): void {
    this.favorites.update(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
  }
  categories = signal<Category[]>([
    { id: '1', name: 'Guitarras', icon: 'musical-note-outline' },
    { id: '2', name: 'Teclados', icon: 'keypad-outline' },
    { id: '3', name: 'Percusión', icon: 'ellipse-outline' },
    { id: '4', name: 'Cuerdas', icon: 'pulse-outline' },
    { id: '5', name: 'Audio', icon: 'mic-outline' },
  ]);

  featuredProducts = signal<Product[]>([
    { id: 'p1', name: 'Guitarra Acústica Yamaha', price: 4500, imageUrl: '', category: 'Guitarras' },
    { id: 'p2', name: 'Teclado Roland GO', price: 7200, imageUrl: '', category: 'Teclados' },
    { id: 'p3', name: 'Batería Pearl Export', price: 15500, imageUrl: '', category: 'Percusión' },
  ]);

  constructor() {
    addIcons({ searchOutline, notificationsOutline, musicalNoteOutline, keypadOutline, ellipseOutline, pulseOutline, micOutline, heartOutline, imageOutline, musicalNotesOutline });
  }
}
