import { emailValidator, requiredPhoneValidator, normalizePersonName, normalizePhone } from '../../../core/validation/auth-fields.validation';
import { demoFullNameValidator } from '../../../core/validation/demo-profile.validation';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NavController, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

import { BACKEND_SESSION_ENABLED } from '../../../core/config/backend-session.token';
import { DemoAccountStateService } from '../../../core/services/demo-account-state.service';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  standalone: true,
  imports: [
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    ReactiveFormsModule,
    CmcInputComponent,
    CmcButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditProfilePage {
  protected readonly connected = inject(BACKEND_SESSION_ENABLED);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly nav = inject(NavController);
  private readonly account = inject(DemoAccountStateService);

  readonly form = this.fb.group({
    name: [this.account.profile().name, [demoFullNameValidator]],
    email: [this.account.profile().email, [emailValidator]],
    phone: [this.account.profile().phone, [requiredPhoneValidator]],
  });

  /** Solo edición DEMO; la rama conectada continúa sin escritura remota. */
  fieldError(field: 'name' | 'email' | 'phone'): string {
    const control = this.form.controls[field];
    if (!control.touched || control.valid) return '';
    if (!control.value.trim()) return { name: 'Ingresa tu nombre completo.', email: 'Ingresa tu correo electrónico.', phone: 'Ingresa tu teléfono.' }[field];
    return {
      name: 'Usa letras y separadores simples (3 a 80 caracteres).',
      email: 'Ingresa un correo válido, por ejemplo nombre@correo.com (máximo 100 caracteres).',
      phone: 'Ingresa 10 dígitos, continuos o agrupados en 3-3-4 o 2-4-4.',
    }[field];
  }

  constructor() {
    addIcons({ arrowBackOutline });
  }

  save(): void {
    if (this.connected) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, email, phone } = this.form.getRawValue();
    this.account.updateProfile({ name: normalizePersonName(name), email: email.trim().toLowerCase(), phone: normalizePhone(phone) });
    void this.nav.navigateBack(['/main/profile']);
  }

  goBack(): void {
    void this.nav.navigateBack(['/main/profile']);
  }
}
