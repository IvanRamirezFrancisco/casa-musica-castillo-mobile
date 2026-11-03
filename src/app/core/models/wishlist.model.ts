export interface WishlistItem {
 readonly wishlistId:number; readonly productId:number; readonly productName:string;
 readonly productImage:string|null; readonly currentPrice:number; readonly availableStock:number|null; readonly available:boolean|null;
}
export interface Wishlist { readonly items:readonly WishlistItem[]; readonly totalItems:number; }
