import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { ApiError } from '../api/api-error';
import type { ProductReview, ReviewDraft, ReviewPage, ReviewRepository } from '../repositories/review.repository';
const invalid=()=>new ApiError('invalid-response',200);
function record(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw invalid();return value as Record<string,unknown>;}
function integer(value:unknown,min=0):number {if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min)throw invalid();return value;}
function text(value:unknown):string {if(typeof value!=='string')throw invalid();return value;}
export function parseReview(value:unknown):ProductReview {const r=record(value);const rating=integer(r['rating'],1);if(rating>5||typeof r['verifiedPurchase']!=='boolean')throw invalid();const date=text(r['createdAt']);if(!/^\d{4}-\d\d-\d\dT/.test(date)||!Number.isFinite(Date.parse(date)))throw invalid();return {id:integer(r['reviewId'],1),rating,title:r['title']===null?'':text(r['title']),comment:text(r['comment']),author:text(r['userName']),date,verified:r['verifiedPurchase']};}
export function parseReviewPage(value:unknown):ReviewPage {const r=record(value);if(!Array.isArray(r['reviews']))throw invalid();const totalReviews=integer(r['totalReviews']);const reviews=r['reviews'].map(parseReview);const currentPage=integer(r['currentPage']);const totalPages=integer(r['totalPages']);if(reviews.length>10||reviews.length>totalReviews||(totalPages>0&&currentPage>=totalPages))throw invalid();return {reviews,totalReviews,currentPage,totalPages};}
@Injectable({providedIn:'root'})
export class HttpReviewRepository implements ReviewRepository {
 private readonly api=inject(ApiClientService);
 list(id:number,page:number){integer(id,1);integer(page);return this.api.get<unknown>(`/api/reviews/product/${id}`,new HttpParams().set('page',page).set('size',10).set('sortBy','RECENT')).pipe(map(parseReviewPage));}
 eligibility(id:number){integer(id,1);return this.api.get<unknown>(`/api/reviews/product/${id}/eligibility`,undefined,{auth:true}).pipe(map(value=>{const r=record(value);if(typeof r['canReview']!=='boolean'||typeof r['hasPurchased']!=='boolean'||typeof r['alreadyReviewed']!=='boolean'||(r['canReview']&&(!r['hasPurchased']||r['alreadyReviewed'])))throw invalid();return {canReview:r['canReview'],hasPurchased:r['hasPurchased'],alreadyReviewed:r['alreadyReviewed']};}));}
 create(draft:ReviewDraft){integer(draft.productId,1);integer(draft.rating,1);if(draft.rating>5||draft.title.length>120||draft.comment.trim().length<10||draft.comment.length>1000)throw invalid();return this.api.post<unknown>('/api/reviews',draft,{auth:true}).pipe(map(parseReview));}
}
