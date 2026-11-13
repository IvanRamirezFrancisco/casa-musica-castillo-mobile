import { ChangeDetectionStrategy, Component, inject, input, OnDestroy, output, TemplateRef, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { AlertController, AnimationController, IonModal } from '@ionic/angular';

@Component({
  selector: 'cmc-action-dialog',
  imports: [IonModal, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-modal class="cmc-action-dialog" [isOpen]="open()" [canDismiss]="canDismiss"
      [enterAnimation]="enter" [leaveAnimation]="leave"
      aria-labelledby="cmc-action-title" (didDismiss)="closed.emit()">
      <ng-template>
        <div class="cmc-action-dialog__frame">
          <span class="cmc-action-dialog__handle" aria-hidden="true"></span>
          <header class="cmc-action-dialog__header">
            <h2 id="cmc-action-title">{{ title() }}</h2>
            <button type="button" class="cmc-action-dialog__close" aria-label="Cerrar"
              [disabled]="busy()" (click)="close()">×</button>
          </header>
          <div class="cmc-action-dialog__body"><ng-container [ngTemplateOutlet]="content()" /></div>
        </div>
      </ng-template>
    </ion-modal>
  `,
})
export class ActionDialogComponent implements OnDestroy {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly content = input.required<TemplateRef<unknown>>();
  readonly busy = input(false);
  readonly dirty = input(false);
  readonly closed = output<void>();
  private readonly modal = viewChild(IonModal);
  private readonly alerts = inject(AlertController);
  private readonly animations = inject(AnimationController);
  private confirming = false;
  readonly enter = (element: HTMLElement) => this.animate(element, false);
  readonly leave = (element: HTMLElement) => this.animate(element, true);

  private animate(element: HTMLElement, leaving: boolean) {
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : leaving ? 170 : 230;
    const animation = this.animations.create().duration(duration).easing('ease-out');
    const backdrop = element.shadowRoot?.querySelector('ion-backdrop');
    const panel = element.shadowRoot?.querySelector<HTMLElement>('[part="content"]');
    if (backdrop) animation.addAnimation(this.animations.create().addElement(backdrop)
      .fromTo('opacity', leaving ? '.48' : '0', leaving ? '0' : '.48'));
    if (panel) {
      const centered = matchMedia('(min-width: 600px), (horizontal-viewport-segments: 2), (vertical-viewport-segments: 2)').matches;
      const hidden = centered ? 'translateY(8px)' : 'translateY(100%)';
      animation.addAnimation(this.animations.create().addElement(panel)
        .fromTo('transform', leaving ? 'translateY(0)' : hidden, leaving ? hidden : 'translateY(0)')
        .fromTo('opacity', leaving ? '1' : centered ? '0' : '1', leaving && centered ? '0' : '1'));
    }
    return animation;
  }

  async close(): Promise<void> {
    await this.modal()?.dismiss();
  }

  ngOnDestroy(): void {
    void this.modal()?.dismiss(undefined, 'view-destroyed');
  }

  readonly canDismiss = async (_data?: unknown, role?: string): Promise<boolean> => {
    if (role === 'view-destroyed') return true;
    if (this.busy() || this.confirming) return false;
    if (!this.dirty()) return true;
    this.confirming = true;
    try {
      const alert = await this.alerts.create({
        header: '¿Descartar los cambios?',
        message: 'Se borrarán los datos ingresados en esta ventana.',
        buttons: [
          { text: 'Seguir editando', role: 'cancel' },
          { text: 'Descartar cambios', role: 'destructive' },
        ],
      });
      await alert.present();
      return (await alert.onDidDismiss()).role === 'destructive';
    } finally {
      this.confirming = false;
    }
  };
}
