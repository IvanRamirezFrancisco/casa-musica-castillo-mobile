import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, mailOutline } from 'ionicons/icons';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { BACKEND_SESSION_ENABLED } from '../../../core/config/backend-session.token';
import { ConnectedForgotPasswordPage } from '../connected/connected-forgot-password.page';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [
    ConnectedForgotPasswordPage,
    IonContent,
    IonIcon,
    ReactiveFormsModule,
    CmcInputComponent,
    CmcButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  readonly connected = inject(BACKEND_SESSION_ENABLED);
  constructor() { addIcons({ arrowBackOutline, mailOutline }); }

  private fb = inject(NonNullableFormBuilder);
  private router = inject(Router);

  isSubmitted = signal(false);

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit() {
    if (this.forgotForm.valid) {
      // Simulate submission
      this.isSubmitted.set(true);
    } else {
      this.forgotForm.markAllAsTouched();
    }
  }

  goBackToLogin() {
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
