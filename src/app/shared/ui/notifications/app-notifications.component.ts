import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  templateUrl: './app-notifications.component.html',
  styleUrl: './app-notifications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppNotificationsComponent {
  protected readonly notificationService = inject(NotificationService);
  protected readonly notifications = this.notificationService.notifications;

  protected dismiss(id: number): void {
    this.notificationService.dismiss(id);
  }
}
