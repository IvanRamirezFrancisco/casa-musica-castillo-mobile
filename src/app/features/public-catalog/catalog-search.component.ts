import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, linkedSignal, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Platform } from '@ionic/angular';
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
    <div class="search-area" (focusout)="onFocusOut($event)" (keydown.escape)="dismissInline($event)">
      <form #form class="search-bar" role="search" (submit)="$event.preventDefault(); submit(field)">
        <cmc-icon name="search" class="search-leading-icon" />
        <input #field [id]="fieldId()" type="search" maxlength="100" enterkeyhint="search"
          autocomplete="off" aria-label="Buscar instrumentos en el catálogo" placeholder="Buscar instrumentos"
          [attr.aria-controls]="suggesting() ? fieldId() + '-suggestions' : null"
          [value]="draftTerm()" (input)="update(field.value)"
          (keydown.enter)="onEnter($event, field)" />
        @if (draftTerm()) {
          <button type="button" class="clear-btn" aria-label="Limpiar búsqueda" (click)="clear(field)"><cmc-icon name="close" /></button>
        }
        <button type="submit" class="search-go-btn" aria-label="Buscar instrumentos">
          <span class="go-pill" aria-hidden="true"><cmc-icon name="arrow" /></span>
        </button>
      </form>
      @if (suggesting()) {
        <div class="suggestions" [id]="fieldId() + '-suggestions'" role="region" tabindex="0" aria-label="Sugerencias del catálogo"
          [style.--suggestions-space]="suggestionsSpace()">
          @switch (status()) {
            @case ('loading') { <p role="status">Buscando…</p> }
            @case ('error') { <p role="status">Sugerencias sin conexión. Puedes intentar la búsqueda.</p> }
            @case ('ready') {
              @if (products().length) {
                <ul>@for (item of products(); track item.id) {
                  <li><a [routerLink]="['/products', item.id]" (click)="selectProduct()">
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
  styles: `:host { display: block; margin-block-end: var(--cmc-space-4); }`,
})
export class CatalogSearchComponent {
  readonly fieldId = input('catalog-search');
  readonly compact = input(false);
  readonly term = input('');
  readonly category = input<number>();
  readonly draftTerm = linkedSignal(() => this.term());
  readonly searched = output<string>();
  readonly productSelected = output<void>();
  readonly suggesting = signal(false);
  readonly suggestionsSpace = signal<string | null>(null);
  readonly status = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly products = signal<readonly PublicProduct[]>([]);
  private readonly platform = inject(Platform);
  private readonly repository = inject(PUBLIC_CATALOG_REPOSITORY);
  private readonly query = new Subject<{ keyword: string; categoryId?: number }>();
  private readonly fieldRef = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly formRef = viewChild<ElementRef<HTMLFormElement>>('form');

  constructor() {
    effect(() => {
      if (this.compact()) this.fieldRef()?.nativeElement.focus({ preventScroll: true });
    });

    effect(onCleanup => {
      if (!this.suggesting()) return;
      const form = this.formRef()?.nativeElement;
      const content = form?.closest('ion-content');
      if (!form || !content) return;

      const viewport = window.visualViewport;
      const measure = () => {
        const bottom = Math.min(content.getBoundingClientRect().bottom,
          viewport ? viewport.offsetTop + viewport.height : window.innerHeight);
        this.suggestionsSpace.set(Math.max(0, bottom - form.getBoundingClientRect().bottom - 14) + 'px');
      };
      measure();
      viewport?.addEventListener('resize', measure);
      viewport?.addEventListener('scroll', measure);
      content.addEventListener('ionScrollEnd', measure);
      const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
      observer?.observe(content);
      const back = this.compact() ? undefined : this.platform.backButton.subscribeWithPriority(200, () => {
        this.resetDraft();
        this.fieldRef()?.nativeElement.focus({ preventScroll: true });
      });
      onCleanup(() => {
        viewport?.removeEventListener('resize', measure);
        viewport?.removeEventListener('scroll', measure);
        content.removeEventListener('ionScrollEnd', measure);
        observer?.disconnect();
        back?.unsubscribe();
      });
    });

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
    this.draftTerm.set(value);
    const keyword = value.trim();
    this.suggesting.set(keyword.length >= 2);
    this.query.next({ keyword, categoryId: this.category() });
  }

  clear(field: HTMLInputElement): void {
    field.value = '';
    this.update('');
    field.focus();
  }

  onEnter(event: Event, field: HTMLInputElement): void {
    if ((event as KeyboardEvent).isComposing) return;
    event.preventDefault();
    this.submit(field);
  }

  onFocusOut(event: FocusEvent): void {
    if (this.compact() || (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) return;
    this.resetDraft();
  }

  dismissInline(event: Event): void {
    if (this.compact()) return;
    event.preventDefault();
    if (!this.suggesting() && this.draftTerm() === this.term()) return;
    event.stopPropagation();
    this.resetDraft();
    this.fieldRef()?.nativeElement.focus({ preventScroll: true });
  }

  selectProduct(): void {
    this.resetDraft();
    this.productSelected.emit();
  }

  submit(field: HTMLInputElement): void {
    const value = field.value.trim();
    this.resetDraft();
    this.searched.emit(value);
  }

  private resetDraft(): void {
    this.suggesting.set(false);
    const term = this.term();
    this.draftTerm.set(term);
    const field = this.fieldRef()?.nativeElement;
    if (field) field.value = term;
    this.query.next({ keyword: '' });
  }
}
