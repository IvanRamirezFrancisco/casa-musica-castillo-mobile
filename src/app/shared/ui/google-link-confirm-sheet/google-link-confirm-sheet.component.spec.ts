import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideIonicAngular } from '@ionic/angular';
import type { PendingGoogleLinkConfirmation } from '../../../core/models/auth.model';
import { ActionDialogComponent } from '../action-dialog/action-dialog.component';
import { GoogleLinkConfirmSheetComponent } from './google-link-confirm-sheet.component';

@Component({
  standalone: true,
  imports: [GoogleLinkConfirmSheetComponent],
  template: `
    <cmc-google-link-confirm-sheet
      [confirmation]="confirmation()"
      [busy]="busy()"
      [errorMessage]="errorMessage()"
      (confirmed)="confirmCount = confirmCount + 1"
      (cancelled)="cancelCount = cancelCount + 1"
    />
  `,
})
class TestHostComponent {
  readonly confirmation = signal<PendingGoogleLinkConfirmation | null>({
    confirmationToken: 'conf-tok-12345678901234567890',
    currentAccountEmail: 'cuenta.actual@ejemplo.com',
    googleEmail: 'google.seleccionada@gmail.com',
    googleEmailVerified: true,
    googleName: 'Usuario Google',
    googlePictureUrl: null,
    sameEmail: false,
    expiresInSeconds: 300,
  });
  readonly busy = signal(false);
  readonly errorMessage = signal('');
  confirmCount = 0;
  cancelCount = 0;
}

describe('GoogleLinkConfirmSheetComponent', () => {
  beforeEach(() => {
    TestBed.overrideComponent(ActionDialogComponent, {
      set: {
        template: `
          @if (open()) {
            <div class="sheet-dialog-host" [attr.data-busy]="busy()" [attr.data-dirty]="dirty()">
              @if (eyebrow()) { <span class="sheet-dialog-eyebrow">{{ eyebrow() }}</span> }
              <h2>{{ title() }}</h2>
              <ng-container [ngTemplateOutlet]="content()" />
            </div>
          }
        `,
      },
    });
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideIonicAngular({ animated: false })],
    });
  });

  it('muestra ambas identidades del backend, mensaje de no cambio de correo y acciones', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const dialogDe = fixture.debugElement.query(By.directive(ActionDialogComponent));
    expect(dialogDe).toBeTruthy();
    const dialog = dialogDe.componentInstance as ActionDialogComponent;
    expect(dialog.open()).toBe(true);
    expect(dialog.eyebrow()).toBe('VERIFICACIÓN COMPLETADA · PASO FINAL');
    expect(dialog.title()).toBe('Confirmar vinculación de Google');
    expect(dialog.dirty()).toBe(false);

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    expect(el.querySelector('[data-testid="link-confirm-current-email"]')?.textContent?.trim()).toBe('cuenta.actual@ejemplo.com');
    expect(el.querySelector('[data-testid="link-confirm-google-email"]')?.textContent?.trim()).toBe('google.seleccionada@gmail.com');
    expect(text).toContain('Tu correo principal no cambiará.');

    const actionButtons = Array.from(el.querySelectorAll<HTMLButtonElement>('.link-confirm-sheet__actions button'));
    const cancelBtn = actionButtons.find((b) => b.textContent?.includes('Cancelar'));
    const confirmBtn = actionButtons.find((b) => b.textContent?.includes('Confirmar vinculación'));
    expect(cancelBtn).toBeTruthy();
    expect(confirmBtn).toBeTruthy();

    cancelBtn!.click();
    confirmBtn!.click();
    dialog.closed.emit();
    expect(fixture.componentInstance.cancelCount).toBe(2);
    expect(fixture.componentInstance.confirmCount).toBe(1);
  });

  it('muestra error de reintento y bloquea acciones mientras busy=true', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.errorMessage.set('Error de conexión temporal.');
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(By.directive(ActionDialogComponent)).componentInstance as ActionDialogComponent;
    expect(dialog.busy()).toBe(true);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe('Error de conexión temporal.');

    const actionButtons = Array.from(el.querySelectorAll<HTMLButtonElement>('.link-confirm-sheet__actions button'));
    expect(actionButtons).toHaveLength(2);
    for (const button of actionButtons) {
      expect(button.disabled).toBe(true);
    }

    fixture.componentInstance.confirmation.set(null);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(ActionDialogComponent))).toBeNull();
  });
});
