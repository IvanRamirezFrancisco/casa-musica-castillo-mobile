import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Wishlist, WishlistItem } from '../models/wishlist.model';
import { HttpWishlistRepository } from '../infrastructure/http-wishlist.repository';
export interface WishlistRepository {
 list():Observable<Wishlist>; add(productId:number):Observable<WishlistItem>; remove(wishlistId:number):Observable<void>;
}
export const WISHLIST_REPOSITORY=new InjectionToken<WishlistRepository>('WISHLIST_REPOSITORY',{
 providedIn:'root',factory:()=>inject(HttpWishlistRepository),
});
