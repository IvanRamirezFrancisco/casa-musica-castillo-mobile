import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, distinctUntilChanged, map, of, switchMap, timer } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PUBLIC_DEMO } from '../../core/config/public-demo.token';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { safeImageUrl } from '../../core/api/public-product.mapper';
import { PublicProduct } from '../../core/models/public-product.model';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular';
import { PublicCatalogService } from '../../core/services/public-catalog.service';
import { PublicProductGridComponent, PublicImageComponent } from './public-product-grid.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';
import { CmcErrorStateComponent } from '../../shared/ui/error-state/cmc-error-state.component';
import { CmcEmptyStateComponent } from '../../shared/ui/empty-state/cmc-empty-state.component';
import { PUBLIC_CATALOG_REPOSITORY } from '../../core/repositories/public-catalog.repository';
@Component({
  selector:'app-public-home', standalone:true, providers:[PublicCatalogService],
  imports:[CmcIconComponent,RouterLink,IonContent,IonHeader,IonToolbar,PublicImageComponent,PublicProductGridComponent,CmcLoadingComponent,CmcErrorStateComponent,CmcEmptyStateComponent],
  host:{class:'ion-page'}, changeDetection:ChangeDetectionStrategy.OnPush,
  styleUrl:'./public-home.view.scss', templateUrl:'./public-home.view.html',
})
export class PublicHomeComponent {
  readonly auth=inject(AuthService);
  readonly publicDemo=inject(PUBLIC_DEMO);
  private readonly apiBase=inject(API_BASE_URL);
  categoryImage(raw:string|null):string|null{return safeImageUrl(raw,this.apiBase);}
  available(products:readonly PublicProduct[]):readonly PublicProduct[]{return products.filter(p=>p.availability==='available').slice(0,4);}
  readonly service=inject(PublicCatalogService); readonly term=signal('');
  readonly suggestions = signal<readonly PublicProduct[]>([]);
  readonly suggestionStatus = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly showSuggestions = signal(false);
  private readonly query = new Subject<string>();
  private readonly catalog = inject(PUBLIC_CATALOG_REPOSITORY);
  private readonly router=inject(Router);
  constructor() {
    this.service.loadHome();
    this.query.pipe(distinctUntilChanged(), switchMap(keyword => {
      this.suggestions.set([]);
      this.suggestionStatus.set(keyword.length < 2 ? 'idle' : 'loading');
      return keyword.length < 2 ? of(null) : timer(300).pipe(
        switchMap(() => this.catalog.catalog({ keyword, size: 5 })),
        map(page => page.content), catchError(() => of('error' as const)),
      );
    }), takeUntilDestroyed()).subscribe(result => {
      if (result === null) return;
      this.suggestionStatus.set(result === 'error' ? 'error' : 'ready');
      if (result !== 'error') this.suggestions.set(result);
    });
  }
  search():void {
    this.showSuggestions.set(false);
    void this.router.navigate(['/main/catalog'], { queryParams: { q: this.term().trim() } });
  }
  setTerm(term: string): void {
    this.term.set(term);
    this.showSuggestions.set(term.trim().length >= 2);
    this.query.next(term.trim());
  }
  update(event:Event):void { if(event.target instanceof HTMLInputElement) this.setTerm(event.target.value); }
  heroImageFailed(event: Event): void {
    if (event.target instanceof HTMLImageElement) event.target.hidden = true;
  }
}
