import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'cmc-otp-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="otp" [class.mfa]="appearance() === 'mfa'">
      <span>{{ label() }}</span>
      <span class="control" [class.invalid]="invalid()" [class.backup]="format() === 'backup'" [class.plain]="plainBackup()">
        <input [id]="fieldId()" type="text" [attr.inputmode]="format() === 'backup' ? 'text' : 'numeric'" autocomplete="one-time-code"
          enterkeyhint="done" autocapitalize="off" spellcheck="false" [value]="value()"
          [attr.aria-describedby]="describedBy() || null" aria-required="true"
          [readOnly]="busy()" [attr.aria-invalid]="invalid()" [attr.aria-busy]="busy()"
          (input)="update($event)">
        <span class="digits" aria-hidden="true">
          @for (index of positions(); track index) {
            @if (format() === 'backup' && index === 4) { <span class="separator">-</span> }
            <span [class.current]="index === displayCode().length"
              [class.filled]="index < displayCode().length">{{ displayCode()[index] || (appearance() === 'mfa' ? '' : '·') }}</span>
          }
        </span>
      </span>
    </label>
  `,
  styles: `
    :host { display: block; min-inline-size: 0; }
    .otp { display: grid; gap: .65rem; font-weight: 700; }
    .control { position: relative; display: block; border-radius: .75rem; }
    .control:focus-within { outline: 2px solid var(--cmc-primary); outline-offset: 4px; }
    input { position: absolute; inset: 0; width: 100%; height: 100%; color: transparent;
      caret-color: transparent; background: transparent; border: 0; font-size: 1rem; }
    input:focus { outline: none; }
    .digits { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: clamp(4px, 2vw, 12px); pointer-events: none; }
    .digits > span { display: grid; place-items: center; min-height: 3rem; border-radius: .65rem;
      border: 1px solid var(--cmc-border); background: var(--cmc-surface-alt);
      color: var(--cmc-text-primary); font: 700 clamp(1rem, 6vw, 1.65rem)/1 system-ui; }
    .digits .filled, .control:focus-within .current { border-color: var(--cmc-primary); }
    .mfa { gap: .85rem; }
    .mfa .digits { gap: clamp(4px, 1.8vw, 10px); }
    .mfa .digits > span { min-height: clamp(3.5rem, 14vw, 5.5rem); border-radius: var(--cmc-radius-md); font-family: Roboto, sans-serif; }
    .mfa .digits .filled { background: var(--cmc-surface); border-color: var(--cmc-border); }
    .mfa .control:focus-within .current { border: 2px solid var(--cmc-primary); background: var(--cmc-surface); }
    .invalid .digits > span { border-color: #a12931; }
    .backup .digits { grid-template-columns: repeat(4, minmax(0, 1fr)) .35rem repeat(4, minmax(0, 1fr)); gap: clamp(2px, 1vw, 7px); }
    .backup .digits > span { font-size: clamp(.875rem, 4.4vw, 1.4rem); }
    .digits .separator { border: 0; background: transparent; }
    .plain { min-height: 3.5rem; }
    .plain .digits { visibility: hidden; }
    .plain input { color: var(--cmc-text-primary); caret-color: auto; padding: .65rem;
      border: 1px solid var(--cmc-border); border-radius: var(--cmc-radius-md); }
    .plain.invalid input { border-color: #a12931; }
  `,
})
export class OtpInputComponent {
  readonly fieldId = input.required<string>();
  readonly label = input('Código de seis dígitos');
  readonly value = input('');
  readonly busy = input(false);
  readonly invalid = input(false);
  readonly describedBy = input('');
  readonly format = input<'numeric' | 'backup'>('numeric');
  readonly appearance = input<'standard' | 'mfa'>('standard');
  readonly digitsChange = output<string>();
  protected readonly positions = computed(() => this.format() === 'backup' ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 3, 4, 5]);
  protected readonly displayCode = computed(() => this.format() === 'backup' ? this.value().replace(/[\s-]/g, '') : this.value());
  protected readonly plainBackup = computed(() => this.format() === 'backup' && !/^[A-Za-z0-9]{0,8}$/.test(this.displayCode()));

  protected update(event: Event): void {
    const field = event.target as HTMLInputElement;
    if (this.busy()) { field.value = this.value(); return; }
    // Backup formatting is visual only. Preserve the complete value for the existing validator/repository.
    const digits = this.format() === 'backup' ? field.value : field.value.replace(/[^0-9]/g, '').slice(0, 6);
    field.value = digits;
    if (!this.busy() && digits !== this.value()) this.digitsChange.emit(digits);
  }
}
