import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
/** Non-sensitive, volatile selection. Never automatically submits a cart mutation. */
@Injectable({providedIn:'root'})
export class PurchaseIntentService {
 private pending:{productId:number;quantity:number;expires:number}|null=null;
 constructor(){inject(AuthService).sessionEnded$.subscribe(()=>{this.pending=null;});}
 remember(productId:number,quantity:number):void { if(Number.isSafeInteger(productId)&&productId>0&&Number.isSafeInteger(quantity)&&quantity>=1&&quantity<=100)this.pending={productId,quantity,expires:Date.now()+600000}; }
 take(productId:number):number|null {if(!this.pending)return null;if(this.pending.expires<=Date.now()){this.pending=null;return null;}if(this.pending.productId!==productId)return null;const value=this.pending.quantity;this.pending=null;return value;}
}
