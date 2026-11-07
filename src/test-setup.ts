import { beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PUBLIC_CATALOG_ENABLED } from './app/core/repositories/public-catalog.repository';
import { BACKEND_SESSION_ENABLED } from './app/core/config/backend-session.token';

// Existing Activity 4 scenarios explicitly exercise DEMO. New HTTP suites test the real views/repository.
beforeEach(() => { TestBed.configureTestingModule({ providers: [{ provide: PUBLIC_CATALOG_ENABLED, useValue: false }, { provide: BACKEND_SESSION_ENABLED, useValue: false }] }); });

// Polyfills for running unit tests under jsdom (the default Vitest environment).
// Ionic components such as ion-menu and ion-split-pane query `window.matchMedia`,
// which jsdom does not implement.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom has no top layer; model open/close for component tests only.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
}
