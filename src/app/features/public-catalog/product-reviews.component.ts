import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { REVIEW_REPOSITORY, ReviewEligibility, ReviewPage } from '../../core/repositories/review.repository';
import { AuthService } from '../../core/services/auth.service';
import { PUBLIC_DEMO } from '../../core/config/public-demo.token';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
@Component({selector:'cmc-product-reviews',standalone:true,imports:[DatePipe,FormsModule,RouterLink,CmcIconComponent],templateUrl:'./product-reviews.component.html',styles:[':host{display:block;}article{padding-block:20px;border-bottom:1px solid var(--cmc-border);}article p{white-space:pre-wrap;margin-top:8px;overflow-wrap:anywhere;} small{color:var(--cmc-text-secondary);} .review-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}form{display:grid;gap:12px;margin-block:16px;}label{display:grid;gap:8px;font-weight:600;}input,textarea,select{font:inherit;font-size:16px;width:100%;box-sizing:border-box;padding:12px;border:1px solid var(--cmc-border-strong);border-radius:12px;background:white;}textarea{min-height:120px;resize:vertical;}.review-paging{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-block:16px;}']})
export class ProductReviewsComponent {
 readonly publicDemo = inject(PUBLIC_DEMO);
 readonly productId=input.required<number>(); readonly auth=inject(AuthService);private readonly repo=inject(REVIEW_REPOSITORY);private readonly destroyRef=inject(DestroyRef);private readonly cancelled=new Subject<void>();
 readonly page=signal<ReviewPage|null>(null);readonly busy=signal(false);readonly error=signal('');readonly notice=signal('');readonly eligibility=signal<ReviewEligibility|null>(null);readonly editing=signal(false);
 rating=5;title='';comment='';
 constructor(){effect(()=>{this.productId();this.cancelled.next();this.page.set(null);this.busy.set(false);this.error.set('');this.clearPrivate();});this.auth.sessionEnded$.pipe(takeUntilDestroyed()).subscribe(()=>{this.cancelled.next();this.busy.set(false);this.clearPrivate();});}
 load(page=0):void{if(this.busy())return;this.busy.set(true);this.error.set('');this.repo.list(this.productId(),page).pipe(takeUntil(this.cancelled),takeUntilDestroyed(this.destroyRef)).subscribe({next:data=>{this.page.set(data);this.busy.set(false);},error:()=>{this.busy.set(false);this.error.set('No pudimos cargar las opiniones. Reintenta cuando tengas conexión.');}});}
 checkEligibility():void{if(this.busy()||!this.auth.hasValidSession())return;this.busy.set(true);this.error.set('');this.repo.eligibility(this.productId()).pipe(takeUntil(this.cancelled),takeUntilDestroyed(this.destroyRef)).subscribe({next:data=>{this.eligibility.set(data);this.editing.set(data.canReview);this.busy.set(false);},error:()=>{this.busy.set(false);this.error.set('No pudimos comprobar tu permiso para opinar. Revisa tu sesión.');}});}
 valid():boolean{return Number.isInteger(this.rating)&&this.rating>=1&&this.rating<=5&&this.title.length<=120&&this.comment.trim().length>=10&&this.comment.length<=1000;}
 submit():void{if(this.busy()||!this.valid()||!this.auth.hasValidSession()||!this.eligibility()?.canReview)return;this.busy.set(true);this.error.set('');this.repo.create({productId:this.productId(),rating:this.rating,title:this.title,comment:this.comment}).pipe(takeUntil(this.cancelled),takeUntilDestroyed(this.destroyRef)).subscribe({next:()=>{this.busy.set(false);this.clearPrivate();this.notice.set('Recibimos tu opinión. Su publicación está sujeta a la revisión del negocio.');},error:()=>{this.busy.set(false);this.error.set('No pudimos enviar tu opinión. El servidor debe autorizar esta operación.');}});}
 private clearPrivate():void{this.eligibility.set(null);this.editing.set(false);this.title='';this.comment='';this.rating=5;this.notice.set('');}
}
