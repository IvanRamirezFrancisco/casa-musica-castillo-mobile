import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { PendingGoogleLinkConfirmation } from '../../../core/models/auth.model';
import { ActionDialogComponent } from '../action-dialog/action-dialog.component';
import { CmcButtonComponent } from '../button/cmc-button.component';
import { CmcIconComponent } from '../icon/cmc-icon.component';

/**
 * Confirmation bottom sheet showing both verified identities returned by the
 * backend before persisting a Google account link.
 */
@Component({
  selector: 'cmc-google-link-confirm-sheet',
  standalone: true,
  imports: [ActionDialogComponent, CmcButtonComponent, CmcIconComponent],
  templateUrl: './google-link-confirm-sheet.component.html',
  styleUrl: './google-link-confirm-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleLinkConfirmSheetComponent {
  readonly confirmation = input<PendingGoogleLinkConfirmation | null>(null);
  readonly busy = input(false);
  readonly errorMessage = input('');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
