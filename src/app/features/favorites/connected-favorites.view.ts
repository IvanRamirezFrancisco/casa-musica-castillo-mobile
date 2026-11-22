import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { WishlistItem } from '../../core/models/wishlist.model';
import { PublicProduct } from '../../core/models/public-product.model';
import { PUBLIC_CATALOG_REPOSITORY } from '../../core/repositories/public-catalog.repository';
import { ProductFavoritesService } from '../../core/services/product-favorites.service';
import { AuthService } from '../../core/services/auth.service';
import { PublicImageComponent, PublicProductGridComponent } from '../public-catalog/public-product-grid.component';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';

@Component({
  selector: 'app-connected-favorites',
  standalone: true,
  host: { class: 'ion-page' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent,
    PublicImageComponent, PublicProductGridComponent, CmcLoadingComponent, CmcIconComponent],
  styleUrl: './connected-favorites.view.scss',
  template: `
    <ion-header class="ion-no-border favorites-header">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/main/profile" text="" aria-label="Volver al perfil" /></ion-buttons>
        <div class="favorites-brand">
          <h1>Casa de Música Castillo</h1>
          <p>{{ favorites.ready() && items().length ? items().length + (items().length === 1 ? ' instrumento guardado' : ' instrumentos guardados') : 'Tus instrumentos favoritos' }}</p>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content class="cmc-page">
      <main class="cmc-page-container favorites-page">
        @if (!auth.hasValidSession()) {
          <p role="status">Inicia sesión para consultar tus favoritos.</p>
          <a class="cmc-link" routerLink="/login" [queryParams]="{returnUrl: '/favorites'}">Iniciar sesión</a>
        } @else {
          <p class="favorite-notice" [attr.role]="!error() && favorites.noticeFailed() ? 'alert' : 'status'">{{ error() ? '' : notice() }}</p>
          @if (loading() || removing()) { <cmc-loading [message]="removing() ? 'Quitando favorito' : 'Consultando favoritos'" /> }
          @if (error()) {
            <p role="alert">{{ error() }}</p>
            <button class="favorite-action retry" type="button" [disabled]="favorites.busy()" (click)="reload()">Reintentar</button>
          }
          @if (empty()) {
            <section class="commerce-empty favorites-empty" aria-labelledby="favorites-empty-heading">
              <span class="empty-mark" aria-hidden="true"><cmc-icon name="heart"/></span>
              <h2 id="favorites-empty-heading">Aún no tienes favoritos</h2>
              <p>Guarda los instrumentos que te gustan y encuéntralos aquí cuando quieras.</p>
              <a class="explore-primary" routerLink="/main/catalog"><cmc-icon name="arrow"/> Explorar catálogo</a>
            </section>
            @if (recommendations().length) {
              <section class="favorites-recommendations" aria-labelledby="recommendations-heading">
                <h2 id="recommendations-heading">Podrían gustarte</h2>
                <cmc-public-product-grid [products]="recommendations()" />
              </section>
            }
          }
          <div class="favorites-grid">
            @for (item of items(); track item.wishlistId) {
              <article class="favorite-card">
                <a class="favorite-link" [routerLink]="['/products', item.productId]">
                  <div class="favorite-image"><cmc-public-image [src]="item.productImage" [alt]="item.productName" [compact]="true"/></div>
                  <div class="favorite-info">
                    @if (metadata().get(item.productId); as product) {
                      <p class="favorite-meta">{{ product.brand }} · {{ product.category }}</p>
                    }
                    <h2>{{ item.productName }}</h2>
                    <p class="favorite-price">{{ item.currentPrice | currency:'MXN' }}</p>
                    <p class="favorite-stock" [class.unavailable]="item.available === false || item.availableStock === 0"><span aria-hidden="true"></span>{{ availability(item) }}</p>
                  </div>
                </a>
                <button class="favorite-action" type="button" [disabled]="favorites.busy()" [attr.aria-busy]="removing()"
                  aria-pressed="true" (click)="remove(item.wishlistId)" [attr.aria-label]="'Quitar de favoritos '+item.productName">
                  <cmc-icon name="saved"/>
                </button>
              </article>
            }
          </div>
          @if (items().length) { <a class="explore-secondary" routerLink="/main/catalog"><cmc-icon name="filters"/> Explorar catálogo</a> }
        }
      </main>
    </ion-content>
  `,
})
export class ConnectedFavoritesComponent {
  readonly favorites = inject(ProductFavoritesService);
  readonly auth = inject(AuthService);
  readonly items = this.favorites.items;
  readonly loading = this.favorites.loading;
  readonly removing = this.favorites.removing;
  readonly error = this.favorites.error;
  readonly notice = computed(() => this.favorites.notice());
  readonly empty = computed(() => this.favorites.ready() && !this.favorites.busy() && !this.error() && !this.items().length);
  readonly recommendations = signal<readonly PublicProduct[]>([]);
  readonly metadata = signal<ReadonlyMap<number, PublicProduct>>(new Map());
  private readonly catalog = inject(PUBLIC_CATALOG_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cancel = new Subject<void>();
  private entered = false;
  private recommendationsRequested = false;
  private metadataRequested = false;
  private accountVersion = this.auth.sessionVersion;

  constructor() {
    this.auth.sessionEnded$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.cancel.next();
      this.recommendations.set([]);
      this.metadata.set(new Map());
      this.recommendationsRequested = false;
      this.metadataRequested = false;
    });
    this.favorites.load();
    effect(() => {
      const user = this.auth.user();
      const version = this.auth.sessionVersion;
      if (version === this.accountVersion) return;
      this.accountVersion = version;
      if (user) untracked(() => this.favorites.load());
    });
    effect(() => {
      if (this.empty()) untracked(() => this.loadRecommendations());
      if (this.items().length) untracked(() => this.loadMetadata());
    });
  }

  ionViewWillEnter(): void {
    if (this.entered) this.reload();
    this.entered = true;
  }

  reload(): void { this.favorites.reload(); }
  remove(id: number): void { this.favorites.remove(id); }

  availability(item: WishlistItem): string {
    if (item.available === false) return 'No disponible';
    if (item.availableStock === 0) return 'Agotado';
    return item.available === true && item.availableStock !== null ? 'Disponible' : 'Disponibilidad por confirmar';
  }

  private loadRecommendations(): void {
    if (this.recommendationsRequested) return;
    this.recommendationsRequested = true;
    this.catalog.featured().pipe(takeUntil(this.cancel), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: page => this.recommendations.set(page.content.slice(0, 2)),
      error: () => this.recommendations.set([]),
    });
  }

  private loadMetadata(): void {
    if (this.metadataRequested) return;
    this.metadataRequested = true;
    // Wishlist does not supply brand/category. One bounded catalog batch avoids per-product requests.
    this.catalog.catalog({ size: 50 }).pipe(takeUntil(this.cancel), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: page => this.metadata.set(new Map(page.content.map(product => [product.id, product]))),
      error: () => this.metadata.set(new Map()),
    });
  }
}
