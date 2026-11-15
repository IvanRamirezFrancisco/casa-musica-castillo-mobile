import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { finalize } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { ApiConnectivityService } from '../../core/api/api-connectivity.service';
import { toApiError } from '../../core/api/api-error';

/** Diagnóstico manual TT-03, separado de los flujos demo. */
@Component({
  selector: 'app-api-connection',
  imports: [IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding">
      <h1>Conexión con la API</h1>
      <p>Servidor: {{ baseUrl }}</p>
      <button type="button" [disabled]="loading()" (click)="check()">
        {{ loading() ? 'Comprobando…' : 'Probar conexión' }}
      </button>
      <p role="status" aria-live="polite">{{ message() }}</p>
    </ion-content>
  `,
})
export class ApiConnectionPage {
  protected readonly baseUrl = inject(API_BASE_URL);
  private readonly connectivity = inject(ApiConnectivityService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly loading = signal(false);
  protected readonly message = signal('Pulsa el botón para consultar categorías activas sin iniciar sesión.');

  protected check(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.message.set('Esperando respuesta…');
    this.connectivity.check().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (count) => this.message.set(`Conexión correcta. Categorías recibidas: ${count}.`),
      error: (error: unknown) => this.message.set(toApiError(error).message),
    });
  }
}
