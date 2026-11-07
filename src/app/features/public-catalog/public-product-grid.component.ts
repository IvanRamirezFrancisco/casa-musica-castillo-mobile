import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { CmcMoneyPipe } from '../../shared/ui/money/cmc-money.pipe';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { RouterLink } from '@angular/router';
import { PublicProduct } from '../../core/models/public-product.model';

@Component({
  selector: 'cmc-public-image', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: block; width: 100%; height: 100%; min-height: 96px; overflow: hidden; background: var(--cmc-surface-alt); } img { display: block; width: 100%; height: 100%; object-fit: contain; padding: 6px; box-sizing: border-box; } span { display: grid; place-items: center; height: 100%; padding: 12px; text-align: center; color: var(--cmc-text-secondary); font-size: 0.85rem; }'],
  template: `@if (src() && failedUrl() !== src()) {
    <img [src]="src()" [alt]="alt()" loading="lazy" decoding="async" referrerpolicy="no-referrer" (error)="failedUrl.set(src())" />
  } @else { <span role="img" [attr.aria-label]="alt() + ': imagen no disponible'">Imagen no disponible</span> }`,
})
export class PublicImageComponent {
  readonly src = input<string | null>(null);
  readonly alt = input('Producto');
  readonly failedUrl = signal<string | null>(null);
}
@Component({
  selector: 'cmc-public-product-grid', standalone: true, imports: [RouterLink, CmcMoneyPipe, CmcIconComponent, PublicImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './public-product-grid.component.scss',
  template: `<div class="products-grid">@for (product of products(); track product.id) {
    <article class="product-card">
      <div class="product-image"><cmc-public-image [src]="product.imageUrl" [alt]="product.name" /></div>
      <div class="product-info">
        <span class="cmc-caption">{{ product.category }} · {{ product.brand }}</span>
        <h3 class="product-name cmc-body">{{ product.name }}</h3>
        @if(product.reviewCount && product.averageRating !== null) {<p class="rating"><cmc-icon name="star"/>{{product.averageRating}} · {{product.reviewCount}} opiniones</p>}<p class="product-price">@if (product.originalPrice !== null) { <del>{{ product.originalPrice | cmcMoney }}</del> }
          {{ product.price | cmcMoney }}</p>
        <p class="cmc-caption stock-badge" [attr.data-status]="product.availability">{{ product.availability === 'available' ? 'Disponible' : product.availability === 'unavailable' ? 'Agotado' : 'Disponibilidad por confirmar' }}</p>
        <a class="detail-btn" [routerLink]="['/products', product.id]" [attr.aria-label]="'Ver información de ' + product.name">Ver información</a>
      </div>
    </article>
  }</div>`,
})
export class PublicProductGridComponent { readonly products = input.required<readonly PublicProduct[]>(); }
