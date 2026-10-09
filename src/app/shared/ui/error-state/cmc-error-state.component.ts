import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { CmcButtonComponent } from '../button/cmc-button.component';

/** Error state with an optional retry action. */
@Component({
  selector: 'cmc-error-state',
  templateUrl: './cmc-error-state.component.html',
  styleUrl: './cmc-error-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CmcButtonComponent],
})
export class CmcErrorStateComponent {
  readonly heading = input.required<string>();
  readonly description = input('');
  /** Set to `false` to hide the retry button. */
  readonly showRetry = input(true, { transform: booleanAttribute });
  readonly retryLabel = input('Reintentar');

  /** Emitted when the user presses the retry button. */
  readonly retry = output<void>();

  protected onRetry(): void {
    this.retry.emit();
  }
}
