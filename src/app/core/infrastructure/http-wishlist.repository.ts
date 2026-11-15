import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { ApiError } from '../api/api-error';
import { API_BASE_URL } from '../api/api-base-url.token';
import { safeImageUrl } from '../api/public-product.mapper';
import type { WishlistRepository } from '../repositories/wishlist.repository';
import { WishlistItem } from '../models/wishlist.model';
const invalid=()=>new ApiError('invalid-response',200);
function object(v:unknown):v is Record<string,unknown>{return !!v && typeof v==='object' && !Array.isArray(v);}
function id(v:unknown):v is number{return typeof v==='number' && Number.isSafeInteger(v) && v>0;}
export function parseWishlistItem(v:unknown,base:string):WishlistItem {
 if(!object(v) || !id(v['wishlistId']) || !id(v['productId']) || typeof v['productName']!=='string' || !v['productName'].trim()
 || typeof v['currentPrice']!=='number' || !Number.isFinite(v['currentPrice']) || v['currentPrice']<0
 || !(v['available']===undefined || v['available']===null || typeof v['available']==='boolean')
 || !(v['productImage']===null || typeof v['productImage']==='string')
 || !(v['availableStock']===null || (typeof v['availableStock']==='number' && Number.isSafeInteger(v['availableStock']) && v['availableStock']>=0)))throw invalid();
 return {wishlistId:v['wishlistId'],productId:v['productId'],productName:v['productName'],currentPrice:v['currentPrice'],
 productImage:safeImageUrl(v['productImage'],base),availableStock:v['availableStock'],available:typeof v['available']==='boolean'?v['available']:null};
}
@Injectable({providedIn:'root'})
export class HttpWishlistRepository implements WishlistRepository {
 private readonly api=inject(ApiClientService);private readonly base=inject(API_BASE_URL);
 list(){return this.api.get<unknown>('/api/wishlist',undefined,{auth:true}).pipe(map(v=>{
 if(!object(v)||!Array.isArray(v['items'])||!Number.isSafeInteger(v['totalItems'])||v['totalItems']!==v['items'].length)throw invalid();
 return {items:v['items'].map(i=>parseWishlistItem(i,this.base)),totalItems:v['totalItems'] as number};
 }));}
 add(productId:number){if(!id(productId))throw invalid();return this.api.post<unknown>('/api/wishlist',{productId},{auth:true}).pipe(map(v=>parseWishlistItem(v,this.base)));}
 remove(wishlistId:number){if(!id(wishlistId))throw invalid();return this.api.delete<unknown>(`/api/wishlist/${wishlistId}`,{auth:true}).pipe(map(()=>undefined));}
}
