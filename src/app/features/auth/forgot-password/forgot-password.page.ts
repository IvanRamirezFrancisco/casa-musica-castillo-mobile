import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, mailOutline } from 'ionicons/icons';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { CmcErrorStateComponent } from '../../../shared/ui/error-state/cmc-error-state.component';
import { strictEmailValidator } from '../../../shared/validators/email.validator';
import { PasswordRecoveryService } from '../../../core/services/password-recovery.service';

/** Estados del flujo de recuperación (TT-18). */
export type RecoveryStatus = 'idle' | 'sending' | 'sent' | 'error';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonIcon,
    ReactiveFormsModule,
    CmcInputComponent,
    CmcButtonComponent,
    CmcErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  constructor() { addIcons({ arrowBackOutline, mailOutline }); }

  private fb = inject(NonNullableFormBuilder);
  private router = inject(Router);
  private recovery = inject(PasswordRecoveryService);

  readonly status = signal<RecoveryStatus>('idle');
  /** Correo normalizado que se mostró en la confirmación. */
  readonly submittedEmail = signal('');
  readonly isSubmitted = computed(() => this.status() === 'sent');
  readonly isSending = computed(() => this.status() === 'sending');

  forgotForm = this.fb.group({
    email: ['', [Validators.required, strictEmailValidator]],
  });

  /** Mensaje específico para campo vacío o formato inválido (TT-16). */
  emailError(): string {
    const control = this.forgotForm.controls.email;
    if (!control.touched || control.valid) {
      return '';
    }
    return control.hasError('required')
      ? 'Ingresa tu correo electrónico.'
      : 'Ingresa un correo válido, por ejemplo nombre@correo.com.';
  }

  async onSubmit(): Promise<void> {
    if (this.isSending()) {
      return; // Evita solicitudes duplicadas mientras hay una en curso.
    }

    const control = this.forgotForm.controls.email;
    control.setValue(control.value.trim());

    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.status.set('sending');
    try {
      await this.recovery.requestReset(control.value);
      this.submittedEmail.set(control.value);
      this.status.set('sent');
    } catch {
      // No se muestran detalles técnicos del error (HU-03, seguridad).
      this.status.set('error');
    }
  }

  useAnotherEmail(): void {
    this.forgotForm.reset();
    this.submittedEmail.set('');
    this.status.set('idle');
  }

  goBackToLogin() {
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
