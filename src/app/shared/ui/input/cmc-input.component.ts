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
  readonly autocomplete = input<string | null>(null);
  readonly required = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly value = signal('');
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

  protected onInput(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    this.value.set(event.target.value);
    this.onChange(event.target.value);
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
