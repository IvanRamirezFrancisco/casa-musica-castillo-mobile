import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { CmcIconComponent } from '../../shared/ui/icon/cmc-icon.component';
import { PublicImageComponent } from './public-product-grid.component';
import { MAX_PHOTO_ZOOM, ORIGINAL_PHOTO, PhotoTransform, Point, Size, boundPhoto, containPhoto, zoomPhoto } from './photo-zoom';

const CENTER = { x: 0, y: 0 };
const EMPTY_SIZE = { width: 0, height: 0 };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

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

  protected readonly opened = signal(false);
  protected readonly activePhoto = computed(() => this.photos()[this.position()]);
  protected readonly transform = signal<PhotoTransform>(ORIGINAL_PHOTO);
  protected readonly maxZoom = MAX_PHOTO_ZOOM;
  protected readonly percent = computed(() => Math.round(this.transform().scale * 100));
  protected readonly photoSize = computed(() => containPhoto(this.viewport(), this.natural()));
  protected readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly cssTransform = computed(() => {
    const { scale, x, y } = this.transform();
    return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  });

  private readonly platform = inject(Platform);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly zoomArea = viewChild<ElementRef<HTMLElement>>('zoomArea');
  private readonly viewport = signal<Size>(EMPTY_SIZE);
  private readonly natural = signal<Size>(EMPTY_SIZE);
  private backSubscription?: Subscription;
  private opener?: HTMLElement;
  private focusFallback?: HTMLElement;
  private readonly pointers = new Map<number, Point>();
  private startTransform = ORIGINAL_PHOTO;
  private startPoint = CENTER;
  private startDistance = 1;
  private multitouch = false;
  private moved = false;
  private lastTap?: { point: Point; time: number };

  constructor() {
    inject(DestroyRef).onDestroy(() => this.backSubscription?.unsubscribe());
    effect(onCleanup => {
      const area = this.zoomArea()?.nativeElement;
      if (!area || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.measure(area));
      observer.observe(area);
      onCleanup(() => observer.disconnect());
    });
    effect(() => {
      this.activePhoto();
      this.natural.set(EMPTY_SIZE);
      this.loadState.set('loading');
      this.resetZoom();
    });
  }

  open(opener?: HTMLElement, focusFallback?: HTMLElement): void {
    const dialog = this.dialog().nativeElement;
    if (!this.activePhoto() || dialog.open) return;
    this.opener = opener;
    this.focusFallback = focusFallback;
    this.resetZoom();
    this.loadState.set('loading');
    this.natural.set(EMPTY_SIZE);
    dialog.showModal();
    this.opened.set(true);
    this.backSubscription = this.platform.backButton.subscribeWithPriority(200, () => this.close());
  }

  close(): void {
    const dialog = this.dialog().nativeElement;
    if (dialog.open) dialog.close();
    this.onClose();
  }

  protected onClose(): void {
    if (!this.opened() || this.dialog().nativeElement.open) return;
    this.opened.set(false);
    this.backSubscription?.unsubscribe();
    this.resetZoom();
    const target = this.opener?.isConnected ? this.opener : this.focusFallback;
    if (target?.isConnected) target.focus({ preventScroll: true });
    this.opener = undefined;
    this.focusFallback = undefined;
  }

  protected photoLoaded(photo: string, event: Event): void {
    const image = event.target;
    const area = this.zoomArea()?.nativeElement;
    if (photo !== this.activePhoto() || !(image instanceof HTMLImageElement) || !area) return;
    this.natural.set({ width: image.naturalWidth, height: image.naturalHeight });
    this.measure(area);
    this.loadState.set('ready');
  }

  protected photoFailed(photo: string): void {
    if (photo !== this.activePhoto()) return;
    this.loadState.set('error');
    this.resetZoom();
    this.photoUnavailable.emit(photo);
  }

  protected pointerDown(event: PointerEvent): void {
    if (event.button !== 0 || this.loadState() !== 'ready' || this.pointers.size >= 2) return;
    const area = event.currentTarget as HTMLElement;
    this.pointers.set(event.pointerId, this.eventPoint(event, area));
    area.setPointerCapture?.(event.pointerId);
    if (this.pointers.size === 2) {
      this.multitouch = true;
      this.lastTap = undefined;
    }
    this.rebaseGesture();
  }

  protected pointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    const point = this.eventPoint(event, event.currentTarget as HTMLElement);
    this.pointers.set(event.pointerId, point);
    const [first, second] = this.pointers.values();
    if (second) {
      const scale = this.startTransform.scale * distance(first, second) / this.startDistance;
      this.apply(zoomPhoto(this.startTransform, scale, this.startPoint, midpoint(first, second)));
    } else {
      this.moved ||= distance(point, this.startPoint) > 10;
      if (this.startTransform.scale > 1) {
        this.apply({ scale: this.startTransform.scale, x: this.startTransform.x + point.x - this.startPoint.x,
          y: this.startTransform.y + point.y - this.startPoint.y });
      }
    }
  }

  protected pointerEnd(event: PointerEvent): void {
    if (!this.pointers.delete(event.pointerId)) return;
    if (this.pointers.size) {
      this.rebaseGesture();
      return;
    }
    if (event.type === 'pointerup' && !this.multitouch) {
      const point = this.eventPoint(event, event.currentTarget as HTMLElement);
      const dx = point.x - this.startPoint.x;
      const dy = point.y - this.startPoint.y;
      if (this.transform().scale === 1 && Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        this.changeImage(dx < 0 ? 1 : -1);
      } else if (!this.moved && distance(point, this.startPoint) <= 10) {
        this.tap(point, event.timeStamp);
      } else {
        this.lastTap = undefined;
      }
    } else {
      this.lastTap = undefined;
    }
    this.multitouch = false;
  }

  protected onKey(event: KeyboardEvent): void {
    const offsets: Record<string, Point> = { ArrowLeft: { x: 40, y: 0 }, ArrowRight: { x: -40, y: 0 },
      ArrowUp: { x: 0, y: 40 }, ArrowDown: { x: 0, y: -40 } };
    const shift = offsets[event.key];
    if (!shift) return;
    const current = this.transform();
    if (current.scale > 1 && event.target === this.zoomArea()?.nativeElement) {
      event.preventDefault();
      this.apply({ scale: current.scale, x: current.x + shift.x, y: current.y + shift.y });
    } else if (shift.x && this.photos().length > 1) {
      event.preventDefault();
      this.changeImage(shift.x > 0 ? -1 : 1);
    }
  }

  protected changeImage(delta: number): void {
    this.selectImage(this.photos()[this.position() + delta]);
  }

  protected selectImage(photo?: string): void {
    if (!photo || photo === this.activePhoto()) return;
    this.resetZoom();
    this.photoChange.emit(photo);
  }

  protected changeZoom(delta: number): void {
    const current = this.transform();
    this.apply(zoomPhoto(current, current.scale + delta, CENTER));
  }

  protected resetZoom(): void {
    this.pointers.clear();
    this.multitouch = false;
    this.moved = false;
    this.lastTap = undefined;
    this.transform.set(ORIGINAL_PHOTO);
  }

  private tap(point: Point, time: number): void {
    if (this.lastTap && time - this.lastTap.time <= 300 && distance(this.lastTap.point, point) <= 28) {
      const current = this.transform();
      this.apply(zoomPhoto(current, current.scale > 1 ? 1 : 2, point));
      this.lastTap = undefined;
    } else {
      this.lastTap = { point, time };
    }
  }

  private rebaseGesture(): void {
    const [first, second] = this.pointers.values();
    this.startTransform = this.transform();
    this.startPoint = second ? midpoint(first, second) : first;
    this.startDistance = second ? Math.max(1, distance(first, second)) : 1;
    this.moved = false;
  }

  private eventPoint(event: PointerEvent, area: HTMLElement): Point {
    const rect = area.getBoundingClientRect();
    return { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 };
  }

  private measure(area: HTMLElement): void {
    const { width, height } = area.getBoundingClientRect();
    this.viewport.set({ width, height });
    this.apply(this.transform());
  }

  private apply(transform: PhotoTransform): void {
    this.transform.set(boundPhoto(transform, this.viewport(), this.photoSize()));
  }
}
