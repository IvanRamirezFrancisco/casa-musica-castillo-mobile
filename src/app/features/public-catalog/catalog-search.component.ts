import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, distinctUntilChanged, map, of, switchMap, timer } from 'rxjs';
import { PUBLIC_CATALOG_REPOSITORY } from '../../core/repositories/public-catalog.repository';
import { PublicProduct } from '../../core/models/public-product.model';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { CmcMoneyPipe } from '../../shared/ui/money/cmc-money.pipe';
import { PublicImageComponent } from './public-product-grid.component';

@Component({
  selector: 'cmc-catalog-search',
  imports: [RouterLink, CmcIconComponent, CmcMoneyPipe, PublicImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search-area" (focusout)="leave($event)" (keydown.escape)="suggesting.set(false)">
      <form class="search-bar" role="search" (submit)="$event.preventDefault(); submit(field)">
        <cmc-icon name="search" />
        <input #field [id]="fieldId()" type="search" maxlength="100" enterkeyhint="search"
          autocomplete="off" aria-label="Buscar instrumentos en el catálogo" placeholder="Buscar instrumentos"
          [value]="term()" (input)="update(field.value)" (focus)="suggest(field.value)"
          (keydown.enter)="$event.preventDefault(); submit(field)" />
        @if (term()) {
          <button type="button" aria-label="Limpiar búsqueda" (click)="clear(field)"><cmc-icon name="close" /></button>
        }
        <button type="submit" aria-label="Buscar instrumentos"><cmc-icon name="arrow" /></button>
      </form>
      @if (suggesting()) {
        <div class="suggestions" aria-label="Sugerencias del catálogo">
          @switch (status()) {
            @case ('loading') { <p role="status">Buscando…</p> }
            @case ('error') { <p role="status">Sugerencias sin conexión. Puedes intentar la búsqueda.</p> }
            @case ('ready') {
              @if (products().length) {
                <ul>@for (item of products(); track item.id) {
                  <li><a [routerLink]="['/products', item.id]" (click)="close(field)">
                    <span class="thumbnail" aria-hidden="true"><cmc-public-image [src]="item.imageUrl" alt="" [compact]="true" /></span>
                    <span class="description"><strong>{{item.name}}</strong><small>{{item.brand}} · {{item.category}}</small></span>
                    <span class="price">{{item.price | cmcMoney}}</span>
                  </a></li>
                }</ul>
              } @else { <p role="status">Sin coincidencias.</p> }
            }
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; margin-block-end: var(--cmc-space-4); }
    .search-area { position: relative; }
    .search-bar { display: flex; align-items: center; gap: .35rem; padding: .25rem .5rem;
      background: var(--cmc-surface); border: 1px solid var(--cmc-border-strong); border-radius: var(--cmc-radius-lg); }
    .search-bar:focus-within { border-color: var(--cmc-primary); }
    .search-bar > cmc-icon { color: var(--cmc-primary); flex: none; margin-inline-start: .35rem; }
    .search-bar input { flex: 1; min-width: 0; border: 0; background: transparent; min-height: 48px; color: var(--cmc-text-primary); }
    .search-bar input::-webkit-search-cancel-button { appearance: none; }
    button { display: grid; place-items: center; min-width: 48px; min-height: 48px;
      background: transparent; color: var(--cmc-primary); }
    .suggestions { margin-block-start: .35rem; max-block-size: min(18rem, 42dvh); overflow-y: auto;
      overscroll-behavior: contain; background: var(--cmc-surface); border: 1px solid var(--cmc-border);
      border-radius: var(--cmc-radius-lg); box-shadow: var(--cmc-shadow-subtle); }
    .suggestions p { margin: 0; padding: .75rem; }
    ul { list-style: none; padding: .25rem; margin: 0; }
    li + li { border-block-start: 1px solid var(--cmc-border); }
    a { display: grid; grid-template-columns: 42px minmax(0,1fr) auto; align-items: center; gap: .5rem;
      color: var(--cmc-text-primary); padding: .375rem; min-height: 54px; text-decoration: none; }
    a:hover, a:focus-visible { background: var(--cmc-surface-alt); }
    .thumbnail { width: 42px; height: 42px; border-radius: .5rem; overflow: hidden; }
    .description { overflow-wrap: anywhere; }
    .description small { display: block; color: var(--cmc-text-secondary); }
    .price { color: var(--cmc-primary); font-weight: 700; font-size: .8rem; }
  `,
})
export class CatalogSearchComponent {
  readonly fieldId = input('catalog-search');
  readonly term = input('');
  readonly category = input<number>();
  readonly termChange = output<string>();
  readonly searched = output<string>();
  readonly suggesting = signal(false);
  readonly status = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly products = signal<readonly PublicProduct[]>([]);
  private readonly repository = inject(PUBLIC_CATALOG_REPOSITORY);
  private readonly query = new Subject<{ keyword: string; categoryId?: number }>();

  constructor() {
    this.query.pipe(
      distinctUntilChanged((a, b) => a.keyword === b.keyword && a.categoryId === b.categoryId),
      switchMap(query => {
        this.products.set([]);
        const valid = query.keyword.length >= 2;
        this.status.set(valid ? 'loading' : 'idle');
        return valid ? timer(300).pipe(
          switchMap(() => this.repository.catalog({ ...query, size: 5 })),
          map(page => [...new Map(page.content.map(item => [item.id, item])).values()]),
          catchError(() => of('error' as const)),
        ) : of(null);
      }),
      takeUntilDestroyed(),
    ).subscribe(result => {
      if (result === null) return;
      this.status.set(result === 'error' ? 'error' : 'ready');
      if (result !== 'error') this.products.set(result);
    });
  }

  update(value: string): void {
    this.termChange.emit(value);
    this.suggest(value);
  }

  suggest(value: string): void {
    const keyword = value.trim();
    this.suggesting.set(keyword.length >= 2);
    this.query.next({ keyword, categoryId: this.category() });
  }

  clear(field: HTMLInputElement): void {
    field.value = '';
    this.update('');
    field.focus();
  }

  leave(event: FocusEvent): void {
    if (!(event.currentTarget instanceof HTMLElement) || !event.currentTarget.contains(event.relatedTarget as Node | null)) {
      this.suggesting.set(false);
    }
  }

  close(field: HTMLInputElement): void {
    this.suggesting.set(false);
    field.blur();
  }

  submit(field: HTMLInputElement): void {
    this.close(field);
    this.searched.emit(field.value.trim());
  }
}
