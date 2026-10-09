import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonSpinner } from '@ionic/angular';

/**
 * Reusable "operation in progress" state.
 *
 * The spinner is purely decorative (`aria-hidden`); the container is a polite
 * live region whose text is either the optional `message` or the fallback
 * "Cargando".
 */
@Component({
  selector: 'cmc-loading',
  templateUrl: './cmc-loading.component.html',
  styleUrl: './cmc-loading.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonSpinner],
})
export class CmcLoadingComponent {
  /** Optional visible message. When omitted a visually hidden "Cargando" is announced. */
  readonly message = input('');

  /** The spinner animation is paused when the user asks the OS to reduce motion. */
  protected readonly reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
