import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'cmc-otp-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="otp">
      <span>{{ label() }}</span>
      <span class="control" [class.invalid]="invalid()">
        <input type="text" inputmode="numeric" autocomplete="one-time-code"
          enterkeyhint="done" autocapitalize="off" spellcheck="false" [value]="value()"
          [readOnly]="busy()" [attr.aria-invalid]="invalid()" [attr.aria-busy]="busy()"
          (input)="update($event)">
        <span class="digits" aria-hidden="true">
          @for (index of positions; track index) {
            <span [class.current]="index === value().length"
              [class.filled]="index < value().length">{{ value()[index] || '·' }}</span>
          }
        </span>
      </span>
    </label>
  `,
  styles: `
    .otp { display: grid; gap: .65rem; font-weight: 700; }
    .control { position: relative; display: block; border-radius: .75rem; }
    .control:focus-within { outline: 2px solid var(--cmc-primary); outline-offset: 4px; }
    input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; font-size: 1rem; }
    .digits { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: clamp(4px, 2vw, 12px); pointer-events: none; }
    .digits > span { display: grid; place-items: center; min-height: 3rem; border-radius: .65rem;
      border: 1px solid var(--cmc-border); background: var(--cmc-surface-alt);
      color: var(--cmc-text-primary); font: 700 clamp(1rem, 6vw, 1.65rem)/1 system-ui; }
    .digits .filled, .control:focus-within .current { border-color: var(--cmc-primary); }
    .invalid .digits > span { border-color: #a12931; }
  `,
})
export class OtpInputComponent {
  readonly label = input('Código de seis dígitos');
  readonly value = input('');
  readonly busy = input(false);
  readonly invalid = input(false);
  readonly digitsChange = output<string>();
  protected readonly positions = [0, 1, 2, 3, 4, 5];

  protected update(event: Event): void {
    const field = event.target as HTMLInputElement;
    const digits = field.value.replace(/[^0-9]/g, '').slice(0, 6);
    field.value = digits;
    if (!this.busy() && digits !== this.value()) this.digitsChange.emit(digits);
  }
}
