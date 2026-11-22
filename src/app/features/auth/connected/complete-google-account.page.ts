import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { EMPTY, catchError, debounceTime, distinctUntilChanged, map, switchMap, tap } from 'rxjs';
import { describeApiError } from '../../../core/api/api-error-message';
import { AUTH_REPOSITORY } from '../../../core/repositories/auth.repository';
import { safeReturnUrl } from '../../../core/security/auth.guard';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleRegistrationStateService } from '../../../core/services/google-registration-state.service';
import {
  FIELD_LIMITS,
  FIELD_MESSAGES,
  normalizePersonName,
  personNameValidator,
  usernameError,
  usernameValidator,
} from '../../../core/validation/auth-fields.validation';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { CmcBrandLogoDirective } from '../../../shared/ui/branding/cmc-brand-logo.directive';

@Component({
  selector: 'app-complete-google-account',
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonIcon, CmcBrandLogoDirective, CmcInputComponent, CmcButtonComponent],
  templateUrl: './complete-google-account.page.html',
  styleUrl: './complete-google-account.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompleteGoogleAccountPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly authRepo = inject(AUTH_REPOSITORY);
  private readonly registrationState = inject(GoogleRegistrationStateService);
  private readonly router = inject(Router);

  protected readonly limits = FIELD_LIMITS;
  protected readonly pendingState = this.registrationState.state;
  protected readonly avatarFailed = signal(false);
  protected readonly termsAccepted = signal(false);
  protected readonly privacyRead = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly usernameStatus = signal<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  protected readonly usernameAvailabilityMessage = signal('');

  protected readonly form = this.fb.group({
    firstName: ['', [personNameValidator]],
    lastName: ['', [personNameValidator]],
    username: ['', [usernameValidator]],
  });

  private initializedToken: string | null = null;

  constructor() {
    addIcons({ arrowBackOutline, shieldCheckmarkOutline });

    effect(() => {
      const state = this.pendingState();
      if (!state) {
        this.initializedToken = null;
        return;
      }
      if (this.initializedToken !== state.pending.registrationToken) {
        this.initializedToken = state.pending.registrationToken;
        this.avatarFailed.set(false);
        this.termsAccepted.set(false);
        this.privacyRead.set(false);
        this.errorMessage.set('');
        this.usernameStatus.set('idle');
        this.usernameAvailabilityMessage.set('');
        this.form.reset(
          {
            firstName: state.pending.profile.firstName ?? '',
            lastName: state.pending.profile.lastName ?? '',
            username: state.pending.profile.suggestedUsername ?? '',
          },
          { emitEvent: false },
        );
      }
    });

    this.form.controls.username.valueChanges
      .pipe(
        map((raw) => raw.trim()),
        tap(() => {
          this.usernameStatus.set('idle');
          this.usernameAvailabilityMessage.set('');
        }),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((candidate) => {
          if (!candidate || usernameError(candidate) !== null) {
            return EMPTY;
          }
          this.usernameStatus.set('checking');
          this.usernameAvailabilityMessage.set('Comprobando disponibilidad...');
          return this.authRepo.checkUsernameAvailability(candidate).pipe(
            catchError(() => {
              this.usernameStatus.set('error');
              this.usernameAvailabilityMessage.set('No se pudo verificar disponibilidad ahora. Se validará al guardar.');
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.usernameStatus.set(result.available ? 'available' : 'taken');
        this.usernameAvailabilityMessage.set(
          result.message || (result.available ? 'Nombre de usuario disponible.' : 'Este nombre de usuario ya está en uso.'),
        );
      });
  }

  protected initials(): string {
    const first = this.form.controls.firstName.value.trim();
    const last = this.form.controls.lastName.value.trim();
    const email = this.pendingState()?.pending.profile.email ?? '';
    const chars = `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
    return chars || (email[0]?.toUpperCase() ?? 'C');
  }

  protected fieldError(name: 'firstName' | 'lastName' | 'username'): string {
    const control = this.form.controls[name];
    if (name === 'username' && this.usernameStatus() === 'taken') {
      return this.usernameAvailabilityMessage() || 'Este nombre de usuario ya está en uso.';
    }
    if (!control.touched || !control.errors) return '';
    const key = Object.keys(control.errors)[0];
    if (name === 'username' && key === 'pattern') {
      return 'Usa solo letras, números, punto, guion y guion bajo.';
    }
    return FIELD_MESSAGES[key] ?? 'Revisa este campo.';
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected backToLogin(): void {
    this.registrationState.clear();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  protected submit(): void {
    const state = this.pendingState();
    if (!state || this.submitting()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid || this.usernameStatus() === 'taken') return;

    const legal = state.pending.legal;
    if (legal?.required && (!this.termsAccepted() || !this.privacyRead())) {
      this.errorMessage.set('Debes aceptar los Términos y Condiciones y confirmar la lectura del Aviso de Privacidad.');
      return;
    }

    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set('');

    this.auth
      .completeGoogleRegistration({
        registrationToken: state.pending.registrationToken,
        username: value.username.trim(),
        firstName: normalizePersonName(value.firstName),
        lastName: normalizePersonName(value.lastName),
        ...(legal?.required
          ? {
              legalAcceptance: {
                termsAccepted: true,
                privacyRead: true,
                termsVersion: legal.termsVersion,
                privacyVersion: legal.privacyVersion,
              },
            }
          : {}),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          const destination = safeReturnUrl(state.returnUrl, '/main/home');
          this.registrationState.clear();
          void this.router.navigateByUrl(destination, { replaceUrl: true });
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(describeApiError(error, 'form'));
        },
      });
  }
}
