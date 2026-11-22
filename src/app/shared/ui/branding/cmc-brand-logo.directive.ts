import { Directive, computed, input } from '@angular/core';
import { BRAND_LOGO_PATHS, BrandLogoVariant } from './brand-assets';

@Directive({
  selector: 'img[appBrandLogo]',
  standalone: true,
  host: {
    '[attr.src]': 'src()',
    '[attr.decoding]': '"async"',
  },
})
export class CmcBrandLogoDirective {
  readonly appBrandLogo = input<BrandLogoVariant>('md');
  protected readonly src = computed(() => BRAND_LOGO_PATHS[this.appBrandLogo()]);
}
