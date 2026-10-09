import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type CmcBadgeVariant = 'neutral' | 'success' | 'warning' | 'error';

/** Small status label. The text content is projected: `<cmc-badge variant="success">Pagado</cmc-badge>`. */
@Component({
  selector: 'cmc-badge',
  templateUrl: './cmc-badge.component.html',
  styleUrl: './cmc-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmcBadgeComponent {
  readonly variant = input<CmcBadgeVariant>('neutral');

  protected readonly classes = computed(() => `cmc-badge cmc-badge--${this.variant()}`);
}
