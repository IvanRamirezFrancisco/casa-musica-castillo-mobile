import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

import { DemoAccountStateService } from '../../../core/services/demo-account-state.service';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { strictEmailValidator } from '../../../shared/validators/email.validator';
import { mxPhoneValidator, normalizePhone } from '../../../shared/validators/phone.validator';

/** Campos que el usuario puede modificar; solo estos se envían al guardar (PS-HU14-02). */
type EditableField = 'name' | 'email' | 'phone';

/**
 * Caracteres permitidos en el nombre:
 * - Letras A-Z y a-z, incluidas vocales acentuadas, ü y ñ.
 * - Entre palabras, uno o más separadores: espacio, apóstrofo ('), punto (.) o guion (-).
 * - Un punto final opcional (p. ej. "Juan Pérez Jr.") y espacios al inicio o al final,
 *   que se eliminan al guardar.
 * Se rechazan dígitos y cualquier otro símbolo.
 */
const NAME_PATTERN = /^\s*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '.-]+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*\.?\s*$/;
const NAME_MIN = 3;
const NAME_MAX = 80;

/**
 * Longitud de 3 a 80 caracteres medida después de `trim()`: los espacios al
 * inicio y al final no cuentan, pero los espacios internos sí cuentan.
 */
function nameLengthValidator(control: AbstractControl<string>): ValidationErrors | null {
  const length = (control.value ?? '').trim().length;
  return length === 0 || (length >= NAME_MIN && length <= NAME_MAX) ? null : { nameLength: true };
}

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
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly account = inject(DemoAccountStateService);

  readonly form = this.fb.group({
    name: [
      this.account.profile().name,
      [Validators.required, nameLengthValidator, Validators.pattern(NAME_PATTERN)],
    ],
    email: [this.account.profile().email, [Validators.required, strictEmailValidator]],
    phone: [this.account.profile().phone, [Validators.required, mxPhoneValidator]],
  });

  /** Mensaje de validación específico por campo (PF-HU14-03). */
  fieldError(field: EditableField): string {
    const control = this.form.controls[field];
    if (!control.touched || control.valid) {
      return '';
    }
    if (control.hasError('required') || (field === 'name' && !control.value.trim())) {
      return {
        name: 'Ingresa tu nombre completo.',
        email: 'Ingresa tu correo electrónico.',
        phone: 'Ingresa tu teléfono.',
      }[field];
    }
    return {
      name: `Usa letras, espacios, apóstrofo, punto o guion (entre ${NAME_MIN} y ${NAME_MAX} caracteres).`,
      email: 'Ingresa un correo válido, por ejemplo nombre@correo.com.',
      phone: 'Ingresa un teléfono de 10 dígitos.',
    }[field];
  }

  constructor() {
    addIcons({ arrowBackOutline });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Lista explícita de campos permitidos y datos normalizados (PS-HU14-02).
    const { name, email, phone } = this.form.getRawValue();
    this.account.updateProfile({
      name: name.trim().replace(/\s+/g, ' '),
      email: email.trim().toLowerCase(),
      phone: normalizePhone(phone),
    });
    void this.router.navigate(['/main/profile']);
  }

  goBack(): void {
    void this.router.navigate(['/main/profile']);
  }
}
