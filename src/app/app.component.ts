import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { AppNotificationsComponent } from './shared/ui/notifications/app-notifications.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, AppNotificationsComponent],
})
export class AppComponent {
  constructor() {}
}
