import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { searchOutline } from 'ionicons/icons';

import { CmcBadgeComponent } from '../../shared/ui/badge/cmc-badge.component';
import { CmcButtonComponent } from '../../shared/ui/button/cmc-button.component';
import { CmcEmptyStateComponent } from '../../shared/ui/empty-state/cmc-empty-state.component';
import { CmcErrorStateComponent } from '../../shared/ui/error-state/cmc-error-state.component';
import { CmcInputComponent } from '../../shared/ui/input/cmc-input.component';
import { CmcLoadingComponent } from '../../shared/ui/loading/cmc-loading.component';

/**
 * Internal development catalog of the Casa de Música Castillo design system.
 * It is NOT part of the user flow: it only renders the shared UI components
 * and their visual states using local, static demo data (no HTTP, no storage).
 */
@Component({
  selector: 'app-foundation-preview',
  templateUrl: './foundation-preview.page.html',
  styleUrl: './foundation-preview.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    ReactiveFormsModule,
    CmcBadgeComponent,
    CmcButtonComponent,
    CmcEmptyStateComponent,
    CmcErrorStateComponent,
    CmcInputComponent,
    CmcLoadingComponent,
  ],
})
export class FoundationPreviewPage {
  /** Demo form: shows Reactive Forms integration only, there are no real validation rules. */
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true }),
    disabled: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
    errorDemo: new FormControl('correo-invalido', { nonNullable: true }),
  });

  /** Mirrors the "name" control to prove the value flows from the input into the form. */
  protected readonly nameValue = toSignal(this.form.controls.name.valueChanges, {
    initialValue: this.form.controls.name.value,
  });

  protected readonly errorMessage = 'Ingresa un correo electrónico válido.';
  protected readonly emptyStateIcon = searchOutline;

  protected readonly retries = signal(0);

  protected onRetry(): void {
    this.retries.update((count) => count + 1);
  }
}
