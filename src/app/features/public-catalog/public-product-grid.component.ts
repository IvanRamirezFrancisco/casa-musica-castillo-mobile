import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { CmcMoneyPipe } from '../../shared/ui/money/cmc-money.pipe';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { Router, RouterLink } from '@angular/router';
import { PublicProduct } from '../../core/models/public-product.model';
import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { AuthService } from '../../core/services/auth.service';
import { ProductFavoritesService } from '../../core/services/product-favorites.service';

@Component({
  selector: 'cmc-public-image', standalone: true, imports: [CmcIconComponent], changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.compact-image]': 'compact()' },
  styles: [':host { display: block; width: 100%; height: 100%; min-height: 96px; overflow: hidden; background: var(--cmc-surface-alt); } img { display: block; width: 100%; height: 100%; object-fit: contain; object-position: var(--cmc-image-position, center); padding: 6px; box-sizing: border-box; } span { display: grid; place-items: center; height: 100%; padding: 12px; text-align: center; color: var(--cmc-text-secondary); font-size: 0.85rem; } :host(.compact-image) { min-height: 0; } :host(.compact-image) span { padding: 4px; font-size: 1.15rem; }'],
  template: `@let image = src();
  @if (image && failedUrl() !== image) {
    <img [src]="image" [alt]="alt()" loading="lazy" decoding="async" referrerpolicy="no-referrer" (error)="reportUnavailable(image)" />
  } @else { <span role="img" [attr.aria-label]="alt() + ': imagen no disponible'">@if(compact()){<cmc-icon name="music"/>}@else{Imagen no disponible}</span> }`,
})
export class PublicImageComponent {
  readonly src = input<string | null>(null);
  readonly alt = input('Producto');
  readonly compact = input(false);
  readonly failedUrl = signal<string | null>(null);
  readonly unavailable = output<string>();

  protected reportUnavailable(image: string): void {
    this.failedUrl.set(image);
    this.unavailable.emit(image);
  }
}
@Component({
  selector: 'cmc-public-product-grid', standalone: true, imports: [RouterLink, CmcMoneyPipe, CmcIconComponent, PublicImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './public-product-grid.component.scss',
  template: `<div class="products-grid">@for (product of products(); track product.id) {
    <article class="product-card">
      <a class="detail-btn" [routerLink]="['/products', product.id]" [attr.aria-label]="product.name">
        <div class="product-image">
          <cmc-public-image [src]="product.imageUrl" [alt]="product.name" />
          @if (product.originalPrice !== null && product.originalPrice > product.price) {
            <span class="product-offer">Oferta</span>
          }
        </div>
        <div class="product-info">
          <span class="cmc-caption">{{ product.category }} · {{ product.brand }}</span>
          <h3 class="product-name cmc-body">{{ product.name }}</h3>
          @if (product.reviewCount && product.averageRating !== null) {
            <p class="rating"><cmc-icon name="star"/>{{product.averageRating}} · {{product.reviewCount}} opiniones</p>
          }
          <p class="product-price">@if (product.originalPrice !== null) { <del>{{ product.originalPrice | cmcMoney }}</del> }
            {{ product.price | cmcMoney }}</p>
          <p class="cmc-caption stock-badge" [attr.data-status]="product.availability"><cmc-icon [name]="product.availability === 'available' ? 'available' : product.availability === 'unavailable' ? 'close' : 'music'"/>{{ product.availability === 'available' ? 'Disponible' : product.availability === 'unavailable' ? 'Agotado' : 'Disponibilidad por confirmar' }}</p>
        </div>
      </a>
      @if (connected) {
        <button type="button" class="card-favorite-btn" [disabled]="favorites.busy()"
          [attr.aria-pressed]="favorites.id(product.id) !== null"
          [attr.aria-busy]="favorites.busy()"
          [attr.aria-label]="(favorites.id(product.id) !== null ? 'Quitar de favoritos: ' : 'Guardar en favoritos: ') + product.name"
          (click)="toggleFavorite(product.id)">
          <cmc-icon [name]="favorites.id(product.id) !== null ? 'saved' : 'heart'"/>
        </button>
      }
    </article>
  }</div>
  @if (connected && favorites.notice(); as notice) { <p role="status">{{ notice }}</p> }`,
})
export class PublicProductGridComponent {
  readonly products = input.required<readonly PublicProduct[]>();
  readonly connected = inject(BACKEND_SESSION_ENABLED);
  readonly favorites = inject(ProductFavoritesService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      if (this.connected && this.auth.user()) untracked(() => this.favorites.load());
    });
  }

  toggleFavorite(productId: number): void {
    if (!this.connected) return;
    if (!this.auth.hasValidSession()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/products/' + productId } });
      return;
    }
    this.favorites.toggle(productId);
  }
}
