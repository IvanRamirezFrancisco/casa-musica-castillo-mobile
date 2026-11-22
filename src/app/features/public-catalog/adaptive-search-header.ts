import { DestroyRef, ElementRef, Injector, afterNextRender, inject, signal } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';

export const COMPACT_ENTER_SCROLL_TOP = 88;
export const COMPACT_EXIT_SCROLL_TOP = 48;

export class AdaptiveSearchHeaderController {
  readonly isHeaderCompact = signal(false);
  readonly searchOverlayOpen = signal(false);

  private readonly platform = inject(Platform);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  private currentScrollTop = 0;
  private progress = 0;
  private opener?: HTMLElement;
  private backSub?: Subscription;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releaseOverlay());
  }

  scrollTop(): number {
    return this.currentScrollTop;
  }

  onScroll(event: Event): void {
    if (this.searchOverlayOpen()) return;
    const raw = (event as CustomEvent<{ scrollTop: number }>).detail?.scrollTop;
    const top = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    this.currentScrollTop = top;
    if (!this.isHeaderCompact() && top >= COMPACT_ENTER_SCROLL_TOP) {
      this.isHeaderCompact.set(true);
    } else if (this.isHeaderCompact() && top <= COMPACT_EXIT_SCROLL_TOP) {
      this.isHeaderCompact.set(false);
    }

    // Ionic batches ionScroll with its rendering loop. Only write while the dock is moving.
    const progress = Math.min(1, top / COMPACT_ENTER_SCROLL_TOP);
    if (!this.reduceMotion?.matches && progress !== this.progress) {
      this.progress = progress;
      this.host.style.setProperty('--store-search-progress', String(progress));
    }
  }

  toggleOverlay(opener?: EventTarget | null): void {
    if (this.searchOverlayOpen()) {
      this.closeOverlay();
      return;
    }
    this.opener = opener instanceof HTMLElement ? opener : undefined;
    this.searchOverlayOpen.set(true);
    this.backSub = this.platform.backButton.subscribeWithPriority(200, () => this.closeOverlay());
  }

  closeOverlay(restoreFocus = true, afterClose?: () => void): void {
    if (!this.searchOverlayOpen()) return;
    this.searchOverlayOpen.set(false);
    this.releaseOverlay();
    const opener = this.opener;
    this.opener = undefined;
    if (restoreFocus || afterClose) {
      afterNextRender(() => {
        if (this.searchOverlayOpen()) return;
        if (restoreFocus && opener?.isConnected) opener.focus({ preventScroll: true });
        afterClose?.();
      }, { injector: this.injector });
    }
  }

  closeOnEscape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeOverlay();
  }

  onPanelFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next === this.opener || (event.currentTarget as HTMLElement).contains(next as Node | null)) return;
    this.closeOverlay(false);
  }

  private releaseOverlay(): void {
    this.backSub?.unsubscribe();
    this.backSub = undefined;
  }
}
