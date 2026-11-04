import { emailValidator } from '../../../core/validation/auth-fields.validation';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { musicalNotesOutline } from 'ionicons/icons';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { CmcInputComponent } from '../../../shared/ui/input/cmc-input.component';
import { CmcButtonComponent } from '../../../shared/ui/button/cmc-button.component';
import { BACKEND_SESSION_ENABLED } from '../../../core/config/backend-session.token';
import { ConnectedLoginPage } from '../connected/connected-login.page';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    ConnectedLoginPage,
    IonContent, IonIcon,
    ReactiveFormsModule,
    RouterLink,
    CmcInputComponent,
    CmcButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  readonly connected = inject(BACKEND_SESSION_ENABLED);
  constructor() { addIcons({ musicalNotesOutline }); }

  private fb = inject(NonNullableFormBuilder);
  private router = inject(Router);

  loginForm = this.fb.group({
    email: ['', [emailValidator]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit() {
    if (this.loginForm.valid) {
      // Simulate login
      this.router.navigate(['/main/home'], { replaceUrl: true });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
