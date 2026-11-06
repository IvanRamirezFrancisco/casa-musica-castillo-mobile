import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CmcIconComponent } from '../icon/cmc-icon.component';

export type CmcInputType = 'text' | 'email' | 'password' | 'tel' | 'number' | 'search' | 'url';

let nextId = 0;

/**
 * Reusable text field compatible with Angular Forms (`formControl`,
 * `formControlName` and `ngModel`). The control value is always a `string`.
 *
 * Error visibility is decided by the parent (e.g. after `touched`), which
 * passes the message through the `error` input. This keeps the component free
 * of any form-specific validation rules.
 */
@Component({
  selector: 'cmc-input',
  imports: [CmcIconComponent],
  templateUrl: './cmc-input.component.html',
  styleUrl: './cmc-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CmcInputComponent),
      multi: true,
    },
  ],
})
export class CmcInputComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly type = input<CmcInputType>('text');
  readonly placeholder = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly digitLimit = input<number | null>(null);
  readonly feedback = input<'negative' | 'warning' | 'positive' | null>(null);
  readonly autocomplete = input<string | null>(null);
  readonly inputMode = input<'text'|'numeric'|'email'|'tel'|'decimal'|null>(null);
  readonly required = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly value = signal('');
  protected readonly revealed = signal(false);
  private readonly formDisabled = signal(false);

  protected readonly inputId = `cmc-input-${nextId++}`;
  protected readonly hintId = `${this.inputId}-hint`;
  protected readonly errorId = `${this.inputId}-error`;

  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  protected readonly hasError = computed(() => this.error().length > 0);
  protected readonly isFilled = computed(() => this.value().length > 0);

  /** Error takes precedence over the hint, and only one is described at a time. */
  protected readonly describedBy = computed<string | null>(() => {
    if (this.hasError()) {
      return this.errorId;
    }
    return this.hint() ? this.hintId : null;
  });

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  protected onBeforeInput(event: Event): void {
    const limit = this.digitLimit();
    if (limit === null || !(event instanceof InputEvent) || event.inputType !== 'insertText' ||
        !event.data || !(event.target instanceof HTMLInputElement)) return;
    const { value, selectionStart, selectionEnd } = event.target;
    const next = value.slice(0, selectionStart ?? value.length) + event.data +
      value.slice(selectionEnd ?? value.length);
    if ((next.match(/[0-9]/g)?.length ?? 0) > limit) event.preventDefault();
  }

  protected onInput(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    const control = event.target;
    const limit = this.digitLimit();
    let value = control.value;
    if (limit !== null) {
      const digits = /[0-9]/g;
      let match = digits.exec(value);
      for (let count = 0; match && count < limit; count++) match = digits.exec(value);
      if (match) {
        const caret = control.selectionStart;
        value = value.slice(0, match.index).replace(/[ -]+$/, '');
        control.value = value;
        if (caret !== null) {
          const position = Math.min(caret, value.length);
          control.setSelectionRange(position, position);
        }
      }
    }
    this.value.set(value);
    this.onChange(value);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  protected togglePassword(control: HTMLInputElement): void {
    if(this.isDisabled())return;
    this.revealed.update(value=>!value);
    control.focus({preventScroll:true});
  }
}
