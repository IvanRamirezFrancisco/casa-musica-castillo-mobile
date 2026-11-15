import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, IonContent],
  styles: ['a { display: inline-flex; align-items: center; min-height: 48px; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="cmc-page cmc-standalone-page">
      <main class="cmc-page-container">
        <h1 class="cmc-title">Página no encontrada</h1>
        <p class="cmc-body">La ruta que intentaste abrir no existe.</p>
        <a class="cmc-link" routerLink="/main/home" replaceUrl>Volver a Inicio</a>
      </main>
    </ion-content>
  `,
})
export class NotFoundPage {}
