import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonModal, IonButtons } from '@ionic/angular';
import { CatalogQuery, PublicSort } from '../../core/api/public-catalog.dto';
import { PublicCatalogService } from '../../core/services/public-catalog.service';
import { PublicProductGridComponent } from './public-product-grid.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';
import { CmcErrorStateComponent } from '../../shared/ui/error-state/cmc-error-state.component';
import { CmcEmptyStateComponent } from '../../shared/ui/empty-state/cmc-empty-state.component';

@Component({
  selector: 'app-public-catalog', standalone: true, providers: [PublicCatalogService],
  imports: [CmcIconComponent, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonModal, IonButtons, PublicProductGridComponent, CmcLoadingComponent, CmcErrorStateComponent, CmcEmptyStateComponent],
  host: { class: 'ion-page' }, changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl:'./public-catalog.view.html',styleUrl:'./public-catalog.view.scss',
})
export class PublicCatalogComponent {
  readonly service = inject(PublicCatalogService);
  private readonly router = inject(Router);
  readonly keyword = signal(''); readonly categoryId = signal(''); readonly sort = signal<PublicSort>('featured');
  readonly filtersOpen=signal(false); readonly draftCategory=signal(''); readonly draftSort=signal<PublicSort>('featured');
  readonly sortOptions:readonly {id:PublicSort;label:string}[]=[{id:'featured',label:'Destacados'},{id:'price_asc',label:'Menor precio'},{id:'price_desc',label:'Mayor precio'},{id:'name_asc',label:'Nombre A–Z'}];
  categoryName():string{return this.service.categories().data?.find(c=>c.id.toString()===this.categoryId())?.name??'Categoría seleccionada';}
  sortLabel():string{return this.sortOptions.find(o=>o.id===this.sort())?.label??'Destacados';}
  openFilters():void{this.draftCategory.set(this.categoryId());this.draftSort.set(this.sort());this.filtersOpen.set(true);}
  resetDraft():void{this.draftCategory.set('');this.draftSort.set('featured');}
  applyFilters():void{this.navigate({categoryId:this.draftCategory()||null,categoria:null,sortBy:this.keyword().trim()?'featured':this.draftSort(),page:null});this.filtersOpen.set(false);}
  constructor() {
    this.service.loadCategories();
    inject(ActivatedRoute).queryParamMap.pipe(map(params => {
      const keyword = (params.get('q') ?? '').slice(0, 100);
      const category = params.get('categoryId') ?? '';
      const rawPage = Number(params.get('page') ?? 0);
      const requestedSort = params.get('sortBy') as PublicSort;
      const sort = ['featured','price_asc','price_desc','name_asc'].includes(requestedSort) ? requestedSort : 'featured';
      this.keyword.set(keyword); this.categoryId.set(category); this.sort.set(keyword.trim() ? 'featured' : sort);
      return { keyword, categoryId: /^[1-9][0-9]*$/.test(category) && Number.isSafeInteger(Number(category)) ? Number(category) : undefined,
        page: Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0, size: 12, sortBy: keyword.trim() ? 'featured' : sort } satisfies CatalogQuery;
    }), debounceTime(200), distinctUntilChanged((a,b) => JSON.stringify(a) === JSON.stringify(b)), takeUntilDestroyed())
      .subscribe(query => this.service.load(query));
  }
  search(value: string): void { this.keyword.set(value); this.navigate({ q: value || null, page: null }); }
  category(value: string): void { this.navigate({ categoryId: value || null, categoria: null, page: null }); }
  order(value: PublicSort): void { this.navigate({ sortBy: value, page: null }); }
  goPage(page: number): void { this.navigate({ page }); }
  clear(): void { void this.router.navigate(['/main/catalog'], { replaceUrl: true }); }
  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate(['/main/catalog'], { queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
