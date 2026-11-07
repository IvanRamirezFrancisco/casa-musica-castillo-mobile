import { inject, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpReviewRepository } from '../infrastructure/http-review.repository';
export interface ProductReview { readonly id:number;readonly rating:number;readonly title:string;readonly comment:string;readonly author:string;readonly date:string;readonly verified:boolean; }
export interface ReviewPage { readonly reviews:readonly ProductReview[];readonly totalReviews:number;readonly currentPage:number;readonly totalPages:number; }
export interface ReviewEligibility { readonly canReview:boolean;readonly hasPurchased:boolean;readonly alreadyReviewed:boolean; }
export interface ReviewDraft { readonly productId:number;readonly rating:number;readonly title:string;readonly comment:string; }
export interface ReviewRepository { list(id:number,page:number):Observable<ReviewPage>;eligibility(id:number):Observable<ReviewEligibility>;create(draft:ReviewDraft):Observable<ProductReview>; }
export const REVIEW_REPOSITORY=new InjectionToken<ReviewRepository>('REVIEW_REPOSITORY',{providedIn:'root',factory:()=>inject(HttpReviewRepository)});
