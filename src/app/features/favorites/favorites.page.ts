import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [RouterLink, IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar],
  styles: ['a { display: inline-flex; align-items: center; min-height: 48px; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border cmc-header-transparent">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/main/home" text="Volver" aria-label="Volver desde Favoritos" /></ion-buttons>
        <ion-title class="cmc-title" role="heading" aria-level="1">Favoritos</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="cmc-page">
      <main class="cmc-page-container">
        <h2 class="cmc-section-title">Tus favoritos, próximamente</h2>
        <p class="cmc-body">La colección de Favoritos estará disponible en una próxima entrega.</p>
        <p class="cmc-text-secondary">Las selecciones de demostración de Inicio son temporales y no se guardan ni se comparten con esta página.</p>
        <a class="cmc-link" routerLink="/main/catalog">Explorar catálogo</a>
      </main>
    </ion-content>
  `,
})
export class FavoritesPage {}
