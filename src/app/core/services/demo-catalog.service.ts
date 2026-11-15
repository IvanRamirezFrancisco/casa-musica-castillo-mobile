import { Injectable } from '@angular/core';
import { CATALOG_DEMO_PRODUCTS } from '../infrastructure/demo-catalog.data';

/** Application query for the immutable demonstration catalog. */
@Injectable({ providedIn: 'root' })
export class DemoCatalogService {
  readonly products = CATALOG_DEMO_PRODUCTS;
  findById(raw: string) {
    if (!/^[1-9][0-9]*$/.test(raw)) return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) ? this.products.find(product => product.id === id) ?? null : null;
  }
}
