
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar
} from '@ionic/angular';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar
  ]
})
export class RegistroPage {

  mostrarPassword = false;
  mostrarConfirmacion = false;
  formularioValidado = false;

  registroForm;

  constructor(private fb: FormBuilder) {
    this.registroForm = this.fb.group({
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30)
      ]],
      firstName: ['', [
        Validators.required,
        Validators.minLength(2)
      ]],
      lastName: ['', [
        Validators.required,
        Validators.minLength(2)
      ]],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      phone: ['', [
        Validators.pattern(/^\d{10}$/)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.pattern(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/
        )
      ]],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    }, {
      validators: this.validarContrasenas
    });

    this.registroForm.valueChanges.subscribe(() => {
      this.formularioValidado = false;
    });
  }

  private validarContrasenas(
    control: AbstractControl
  ): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmacion = control.get('confirmPassword')?.value;

    if (!confirmacion) return null;

    return password === confirmacion
      ? null
      : { passwordsMismatch: true };
  }

  mostrarError(campo: string): boolean {
    const control = this.registroForm.get(campo);
    return !!control &&
      control.invalid &&
      (control.touched || control.dirty);
  }

  errorContrasenas(): boolean {
    const confirmacion =
      this.registroForm.get('confirmPassword');

    return !!confirmacion &&
      (confirmacion.touched || confirmacion.dirty) &&
      this.registroForm.hasError('passwordsMismatch');
  }

  mensajeError(campo: string): string {
    const control = this.registroForm.get(campo);

    if (!control) return '';

    if (control.hasError('required') ||
        control.hasError('requiredTrue')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('email')) {
      return 'Introduce un correo electrónico válido.';
    }

    if (control.hasError('minlength')) {
      return 'El campo no cumple la longitud mínima.';
    }

    if (control.hasError('maxlength')) {
      return 'El campo supera la longitud permitida.';
    }

    if (control.hasError('pattern')) {
      if (campo === 'phone') {
        return 'Introduce un teléfono de 10 dígitos.';
      }

      if (campo === 'password') {
        return 'Incluye mayúscula, minúscula, número y símbolo.';
      }
    }

    return 'Revisa la información ingresada.';
  }

  enviarRegistro(): void {
    this.formularioValidado = false;

    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    // Pendiente: conectar AuthService con Spring Boot.
    // No se envían ni almacenan contraseñas.
    this.formularioValidado = true;
  }
}
