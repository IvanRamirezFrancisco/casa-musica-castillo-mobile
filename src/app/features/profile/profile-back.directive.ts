import { DestroyRef, Directive, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, Platform } from '@ionic/angular';
import { safeReturnUrl } from '../../core/security/auth.guard';

/** Back from the root tab: use a known app destination, never browser history or auth. */
@Directive({ selector: 'button[appProfileBack]', standalone: true })
export class ProfileBackDirective {
  private readonly router = inject(Router);
  private readonly nav = inject(NavController);
  private navigating = false;

  constructor() {
    // Ionic overlays (100) and menus (99) retain precedence. Cached tabs delegate.
    const subscription = inject(Platform).backButton.subscribeWithPriority(1, next => {
      if (this.router.url.split(/[?#]/)[0] === '/main/profile') void this.goBack();
      else next();
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  @HostListener('click')
  async goBack(): Promise<void> {
    if (this.navigating) return;
    const previous = this.router.lastSuccessfulNavigation()?.previousNavigation?.finalUrl;
    const candidate = previous ? safeReturnUrl(this.router.serializeUrl(previous)) : '/main/home';
    // Profile child flows and authentication must not become a return loop.
    const path = candidate.split(/[?#]/)[0];
    const destination = /^\/(main\/(home|catalog|cart|orders)|favorites|products\/[1-9]\d*|orders\/[1-9]\d*|privacy(?:\/my-data)?)$/.test(path)
      ? candidate : '/main/home';
    this.navigating = true;
    try {
      await this.nav.navigateBack(destination, { replaceUrl: true });
    } finally {
      this.navigating = false;
    }
  }
}
