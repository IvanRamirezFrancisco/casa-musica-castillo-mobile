import { NgTemplateOutlet } from '@angular/common';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { CmcBrandLogoDirective } from '../../shared/ui/branding/cmc-brand-logo.directive';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonModal, IonButtons, type ScrollCustomEvent } from '@ionic/angular';
import { CatalogQuery, PublicSort } from '../../core/api/public-catalog.dto';
import { PUBLIC_DEMO } from '../../core/config/public-demo.token';
import { PublicCatalogService } from '../../core/services/public-catalog.service';
import { PublicProductGridComponent } from './public-product-grid.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';
import { CmcErrorStateComponent } from '../../shared/ui/error-state/cmc-error-state.component';
import { CmcEmptyStateComponent } from '../../shared/ui/empty-state/cmc-empty-state.component';
import { CatalogSearchComponent } from './catalog-search.component';
import { AdaptiveSearchHeaderController } from './adaptive-search-header';

@Component({
  selector: 'app-public-catalog', standalone: true, providers: [PublicCatalogService],
  imports: [CatalogSearchComponent, NgTemplateOutlet, CmcBrandLogoDirective, CmcIconComponent, RouterLink, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonModal, IonButtons, PublicProductGridComponent, CmcLoadingComponent, CmcErrorStateComponent, CmcEmptyStateComponent],
  host: { class: 'ion-page' }, changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl:'./public-catalog.view.html',styleUrl:'./public-catalog.view.scss',
})
export class PublicCatalogComponent {
  readonly publicDemo = inject(PUBLIC_DEMO);
  readonly service = inject(PublicCatalogService);
  readonly header = new AdaptiveSearchHeaderController();
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly content = viewChild(IonContent);
  private readonly resultsHeading = viewChild<ElementRef<HTMLElement>>('resultsHeading');
  private lastFilterTrigger?: HTMLElement;

  readonly appliedTerm = signal(''); readonly categoryId = signal(''); readonly sort = signal<PublicSort>('featured');
  readonly filtersOpen=signal(false); readonly draftCategory=signal(''); readonly draftSort=signal<PublicSort>('featured');
  readonly sortOptions:readonly {id:PublicSort;label:string}[]=[{id:'featured',label:'Destacados'},{id:'price_asc',label:'Menor precio'},{id:'price_desc',label:'Mayor precio'},{id:'name_asc',label:'Nombre A–Z'}];
  categoryName():string{return this.service.categories().data?.find(c=>c.id.toString()===this.categoryId())?.name??'Categoría seleccionada';}
  sortLabel():string{return this.sortOptions.find(o=>o.id===this.sort())?.label??'Destacados';}
  activeFilterCount(): number {
    return (this.categoryId() ? 1 : 0) + (this.sort() !== 'featured' ? 1 : 0);
  }
  filterButtonLabel(): string {
    const count = this.activeFilterCount();
    if (!count) return 'Abrir filtros y ordenamiento';
    return `Abrir filtros y ordenamiento, ${count} ${count === 1 ? 'filtro activo' : 'filtros activos'}`;
  }
  openFilters(trigger?: EventTarget | null):void{
    if (this.header.searchOverlayOpen()) {
      this.header.closeOverlay(false);
    }
    this.lastFilterTrigger = trigger instanceof HTMLElement
      ? trigger
      : (document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
    this.draftCategory.set(this.categoryId());
    this.draftSort.set(this.sort());
    this.filtersOpen.set(true);
  }
  closeFilters():void{
    this.filtersOpen.set(false);
    const fallback=document.querySelector<HTMLButtonElement>('.catalog-controls button');
    const target = this.lastFilterTrigger?.isConnected ? this.lastFilterTrigger : fallback;
    if(target && (!document.activeElement || document.activeElement===document.body || document.activeElement.closest('ion-modal'))){
      target.focus({ preventScroll: true });
    }
  }
  resetDraft():void{this.draftCategory.set('');this.draftSort.set('featured');}
  applyFilters():void{
    const nextSort = this.appliedTerm().trim() ? 'featured' : this.draftSort();
    const changed = this.draftCategory() !== this.categoryId() || nextSort !== this.sort();
    this.navigate({categoryId:this.draftCategory()||null,categoria:null,sortBy:nextSort,page:null});
    this.filtersOpen.set(false);
    if (changed) {
      void this.content()?.scrollToTop(200);
    }
  }
  constructor() {
    this.service.loadCategories();
    inject(ActivatedRoute).queryParamMap.pipe(map(params => {
      const keyword = (params.get('q') ?? '').slice(0, 100).trim();
      const category = params.get('categoryId') ?? '';
      const rawPage = Number(params.get('page') ?? 0);
      const requestedSort = params.get('sortBy') as PublicSort;
      const sort = ['featured','price_asc','price_desc','name_asc'].includes(requestedSort) ? requestedSort : 'featured';
      this.appliedTerm.set(keyword); this.categoryId.set(category); this.sort.set(keyword.trim() ? 'featured' : sort);
      if (!this.filtersOpen()) {
        this.draftCategory.set(category);
        this.draftSort.set(this.sort());
      }
      return { keyword, categoryId: /^[1-9][0-9]*$/.test(category) && Number.isSafeInteger(Number(category)) ? Number(category) : undefined,
        page: Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0, size: 12, sortBy: keyword.trim() ? 'featured' : sort } satisfies CatalogQuery;
    }), debounceTime(200), distinctUntilChanged((a,b) => JSON.stringify(a) === JSON.stringify(b)), takeUntilDestroyed())
      .subscribe(query => this.service.load(query));
  }
  searchCategory(): number | undefined { return Number(this.categoryId()) || undefined; }
  onCatalogSearchSubmitted(value: string): void {
    const term = value.slice(0, 100).trim();
    const changed = term !== this.appliedTerm();
    if (!changed) {
      this.header.closeOverlay();
      return;
    }
    this.navigate({ q: term || null, page: null });
    const focusResults = () => this.focusResults();
    if (this.header.searchOverlayOpen()) {
      this.header.closeOverlay(false, focusResults);
    } else {
      afterNextRender(focusResults, { injector: this.injector });
    }
  }

  onContentScroll(event: ScrollCustomEvent): void {
    // The compact panel is non-modal. Let the same gesture move the content and dismiss the panel.
    if (this.header.searchOverlayOpen() && Math.abs(event.detail.scrollTop - this.header.scrollTop()) >= 8) {
      this.header.closeOverlay(false);
    }
    this.header.onScroll(event);
  }

  ionViewWillLeave(): void {
    this.header.closeOverlay(false);
    this.filtersOpen.set(false);
    this.lastFilterTrigger = undefined;
  }

  private focusResults(): void {
    void this.content()?.scrollToTop();
    this.resultsHeading()?.nativeElement.focus({ preventScroll: true });
  }

  category(value: string): void { this.navigate({ categoryId: value || null, categoria: null, page: null }); }
  order(value: PublicSort): void { this.navigate({ sortBy: value, page: null }); }
  goPage(page: number): void {
    void this.navigate({ page }).then(changed => {
      if (changed) this.focusResults();
    });
  }
  clear(): void { void this.router.navigate(['/main/catalog'], { replaceUrl: true }); }
  private navigate(queryParams: Record<string, string | number | null>): Promise<boolean> {
    return this.router.navigate(['/main/catalog'], { queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
