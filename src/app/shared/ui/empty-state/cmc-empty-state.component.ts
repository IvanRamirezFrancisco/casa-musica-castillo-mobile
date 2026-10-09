import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/**
 * Generic "nothing here" state (empty cart, no orders, no results...).
 *
 * `heading` is used instead of `title` on purpose: a `title` attribute on the
 * host element would also render a native browser tooltip.
 */
@Component({
  selector: 'cmc-empty-state',
  templateUrl: './cmc-empty-state.component.html',
  styleUrl: './cmc-empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
})
export class CmcEmptyStateComponent {
  readonly heading = input.required<string>();
  readonly description = input('');
  /**
   * Optional decorative icon: an Ionicons SVG imported from `ionicons/icons`
   * (e.g. `cartOutline`) or an icon name previously registered with `addIcons`.
   */
  readonly icon = input<string | null>(null);
}
