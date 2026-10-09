import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type CmcButtonVariant = 'primary' | 'secondary' | 'ghost';
export type CmcButtonSize = 'default' | 'compact';
export type CmcButtonType = 'button' | 'submit';

/**
 * Reusable button.
 *
 * Renders a native `<button>` (no shadow DOM) so that `type="submit"` keeps
 * working inside Angular forms. Consumers listen to the regular `(click)`
 * event on `<cmc-button>`: it is never emitted while the button is
 * disabled or loading.
 */
@Component({
  selector: 'cmc-button',
  templateUrl: './cmc-button.component.html',
  styleUrl: './cmc-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.cmc-button-host--full]': 'fullWidth()',
    '[class.cmc-button-host--disabled]': 'disabled()',
  },
})
export class CmcButtonComponent {
  readonly variant = input<CmcButtonVariant>('primary');
  readonly size = input<CmcButtonSize>('default');
  readonly type = input<CmcButtonType>('button');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly fullWidth = input(false, { transform: booleanAttribute });
  /** Text announced to assistive technology while `loading` is true. */
  readonly loadingLabel = input('Cargando');

  protected readonly classes = computed(
    () => `cmc-button cmc-button--${this.variant()} cmc-button--${this.size()}`,
  );

  protected onClick(event: Event): void {
    // A loading button stays focusable (aria-disabled) so keyboard users do
    // not lose focus; we must therefore block the activation ourselves,
    // including the implicit form submission.
    if (this.loading() || this.disabled()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
