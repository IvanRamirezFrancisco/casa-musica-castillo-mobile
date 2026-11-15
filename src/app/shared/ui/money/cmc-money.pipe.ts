import { Pipe, PipeTransform } from '@angular/core';
const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
@Pipe({name:'cmcMoney',standalone:true})
export class CmcMoneyPipe implements PipeTransform { transform(value:number):string { return mxn.format(value); } }
