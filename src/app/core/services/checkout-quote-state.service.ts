import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, concat, defer, map, of, switchMap } from 'rxjs';
import { describeApiError } from '../api/api-error-message';
import type { PricePreview, PricePreviewInput } from '../models/real-checkout.model';
import { CHECKOUT_REPOSITORY } from '../repositories/checkout.repository';
import { AuthService } from './auth.service';

interface QuoteState {
  readonly quote: PricePreview | null;
  readonly loading: boolean;
  readonly error: string;
}
const empty = (): QuoteState => ({ quote: null, loading: false, error: '' });

/** Per-checkout presentation state: stale prices never survive a change of destination or session. */
@Injectable()
export class CheckoutQuoteStateService {
  private readonly repository = inject(CHECKOUT_REPOSITORY);
  private readonly requests = new Subject<PricePreviewInput | null>();
  private readonly state = signal<QuoteState>(empty());
  readonly quote = computed(() => this.state().quote);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);

  constructor() {
    this.requests.pipe(
      switchMap(input => input === null ? of(empty()) : concat(
        of<QuoteState>({ quote: null, loading: true, error: '' }),
        defer(() => this.repository.previewPrice(input)).pipe(
          map(quote => ({ quote, loading: false, error: '' })),
          catchError((error: unknown) => of<QuoteState>({ quote: null, loading: false, error: describeApiError(error, 'form') })),
        ),
      )),
      takeUntilDestroyed(),
    ).subscribe(state => this.state.set(state));
    inject(AuthService).sessionEnded$.pipe(takeUntilDestroyed()).subscribe(() => this.invalidate());
  }

  load(input: PricePreviewInput): void { this.requests.next({ ...input }); }
  invalidate(): void { this.requests.next(null); }
}
