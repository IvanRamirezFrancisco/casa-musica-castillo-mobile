import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { PublicImageComponent } from './public-product-grid.component';

@Component({
  selector: 'cmc-product-photo-viewer',
  standalone: true,
  imports: [CmcIconComponent, PublicImageComponent],
  templateUrl: './product-photo-viewer.component.html',
  styleUrl: './product-photo-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPhotoViewerComponent {
  readonly photos = input.required<readonly string[]>();
  readonly title = input.required<string>();
  readonly position = input.required<number>();
  readonly photoChange = output<string>();
  readonly photoUnavailable = output<string>();
  protected readonly zoom = signal(1);
  protected readonly activePhoto = computed(() => this.photos()[this.position()]);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly zoomArea = viewChild<ElementRef<HTMLElement>>('zoomArea');

  open(): void {
    const dialog = this.dialog().nativeElement;
    if (!this.activePhoto() || dialog.open) return;
    this.resetZoom();
    dialog.showModal();
  }

  close(): void {
    const dialog = this.dialog().nativeElement;
    if (dialog.open) dialog.close();
  }

  protected onArrow(event: Event, delta: number): void {
    const area = this.zoomArea()?.nativeElement;
    if (this.zoom() > 1 && event.target instanceof Node && area?.contains(event.target)) return;
    event.preventDefault();
    this.changeImage(delta);
  }

  protected changeImage(delta: number): void {
    const next = this.photos()[this.position() + delta];
    if (!next) return;
    this.resetZoom();
    this.photoChange.emit(next);
  }

  protected changeZoom(delta: number): void {
    this.zoom.update(value => Math.min(3, Math.max(1, value + delta)));
  }

  protected resetZoom(): void {
    this.zoom.set(1);
    const area = this.zoomArea()?.nativeElement;
    if (area) {
      area.scrollTop = 0;
      area.scrollLeft = 0;
    }
  }
}
