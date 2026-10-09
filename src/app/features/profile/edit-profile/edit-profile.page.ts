import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

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
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly account = inject(DemoAccountStateService);

  readonly form = this.fb.group({
    name: [this.account.profile().name, [Validators.required, Validators.pattern(/\S/)]],
    email: [this.account.profile().email, [Validators.required, Validators.email]],
    phone: [this.account.profile().phone, [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
  });

  constructor() {
    addIcons({ arrowBackOutline });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, email, phone } = this.form.getRawValue();
    this.account.updateProfile({ name: name.trim(), email: email.trim(), phone });
    void this.router.navigate(['/main/profile']);
  }

  goBack(): void {
    void this.router.navigate(['/main/profile']);
  }
}
