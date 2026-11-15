import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, finalize, of, shareReplay, switchMap, takeUntil, tap } from 'rxjs';
import { BACKEND_SESSION_ENABLED } from '../config/backend-session.token';
import { WishlistItem } from '../models/wishlist.model';
import { WISHLIST_REPOSITORY } from '../repositories/wishlist.repository';
import { AuthService } from './auth.service';

/** One server snapshot per authenticated session, shared by catalog and detail. */
@Injectable({ providedIn: 'root' })
export class ProductFavoritesService {
  private readonly repository = inject(WISHLIST_REPOSITORY);
  private readonly auth = inject(AuthService);
  private readonly connected = inject(BACKEND_SESSION_ENABLED);
  private readonly destroyRef = inject(DestroyRef);
  private readonly resetRequests = new Subject<void>();
  private readonly entries = signal(new Map<number, WishlistItem>());
  private readonly pending = signal<number | null>(null);
  private readonly feedback = signal<{ productId: number; message: string } | null>(null);
  private readonly loadingState = signal(false);
  private readonly version = signal(-1);
  private feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  private loaded = false;
  private reading: Observable<void> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.feedbackTimer));
    this.auth.sessionEnded$.pipe(takeUntilDestroyed()).subscribe(() => this.reset());
  }

  id(productId: number): number | null {
    return this.active() ? this.entries().get(productId)?.wishlistId ?? null : null;
  }

  busy(): boolean { return this.active() && (this.loadingState() || this.pending() !== null); }
  notice(productId?: number): string {
    const result = this.feedback();
    return this.active() && result && (productId === undefined || result.productId === 0 || result.productId === productId) ? result.message : '';
  }

  load(): void {
    if (!this.prepare() || this.loaded || this.reading) return;
    this.read().subscribe({ error: () => this.report(0, 'No pudimos consultar tus favoritos. Intenta de nuevo.') });
  }

  toggle(productId: number): void {
    if (!Number.isSafeInteger(productId) || productId < 1 || !this.prepare() || this.pending() !== null) return;
    const version = this.version();
    const removing = this.id(productId) !== null;
    this.pending.set(productId);
    this.clearFeedback();
    this.read().pipe(
      switchMap(() => {
        if (!this.active() || this.version() !== version) return EMPTY;
        const wishlistId = this.id(productId);
        if (wishlistId !== null) {
          if (!removing) {
            this.report(productId, 'Este producto ya está en tus favoritos.', true);
            return EMPTY;
          }
          return this.repository.remove(wishlistId).pipe(tap(() => {
            if (!this.active()) return;
            this.forget(wishlistId);
            this.report(productId, 'Producto retirado de favoritos.', true);
          }));
        }
        if (removing) return EMPTY;
        return this.repository.add(productId).pipe(tap(item => {
          if (!this.active()) return;
          if (item.productId !== productId) throw new Error('El favorito corresponde a otro producto.');
          this.entries.update(entries => new Map(entries).set(productId, item));
          this.report(productId, 'Producto guardado en favoritos.', true);
        }));
      }),
      takeUntil(this.resetRequests),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { if (this.version() === version) this.pending.set(null); }),
    ).subscribe({ error: () => this.report(productId, 'No se pudo actualizar el favorito. Intenta de nuevo.') });
  }

  /** Called only after a confirmed deletion from the favorites page. */
  forget(wishlistId: number): void {
    this.entries.update(entries => new Map([...entries].filter(([, item]) => item.wishlistId !== wishlistId)));
  }

  private active(): boolean {
    return this.connected && this.auth.hasValidSession() && this.version() === this.auth.sessionVersion;
  }

  private prepare(): boolean {
    if (!this.connected || !this.auth.hasValidSession()) return false;
    if (this.version() !== this.auth.sessionVersion) {
      this.reset();
      this.version.set(this.auth.sessionVersion);
    }
    return true;
  }

  private read(): Observable<void> {
    if (this.loaded) return of(undefined);
    if (this.reading) return this.reading;
    const version = this.version();
    this.loadingState.set(true);
    this.reading = this.repository.list().pipe(
      switchMap(list => {
        if (this.active() && this.version() === version) {
          this.entries.set(new Map(list.items.map(item => [item.productId, item])));
          this.loaded = true;
          if (this.feedback()?.productId === 0) this.feedback.set(null);
        }
        return of(undefined);
      }),
      takeUntil(this.resetRequests),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        if (this.version() !== version) return;
        this.reading = null;
        this.loadingState.set(false);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    return this.reading;
  }

  private report(productId: number, message: string, temporary = false): void {
    if (!this.active()) return;
    this.clearFeedback();
    this.feedback.set({ productId, message });
    if (temporary) this.feedbackTimer = setTimeout(() => this.clearFeedback(), 3000);
  }

  private clearFeedback(): void {
    clearTimeout(this.feedbackTimer);
    this.feedbackTimer = undefined;
    this.feedback.set(null);
  }

  private reset(): void {
    this.version.set(-1);
    this.resetRequests.next();
    this.entries.set(new Map());
    this.clearFeedback();
    this.pending.set(null);
    this.loadingState.set(false);
    this.loaded = false;
    this.reading = null;
  }
}
