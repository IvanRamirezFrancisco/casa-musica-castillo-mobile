import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
  private readonly router=inject(Router);
  constructor() { this.service.loadHome(); }
  search():void { void this.router.navigate(['/main/catalog'], { queryParams: { q: this.term() } }); }
  update(event:Event):void { if(event.target instanceof HTMLInputElement) this.term.set(event.target.value); }
}
