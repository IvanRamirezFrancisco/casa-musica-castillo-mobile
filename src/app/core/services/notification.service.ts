import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export type AppNotificationVariant = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  readonly id: number;
  readonly variant: AppNotificationVariant;
  readonly title: string;
  readonly message?: string;
  readonly dismissible: boolean;
}

export interface ShowNotificationOptions {
  readonly variant: AppNotificationVariant;
  readonly title: string;
  readonly message?: string;
  readonly durationMs?: number;
  readonly dismissible?: boolean;
}

const DEFAULT_DURATION_MS: Record<AppNotificationVariant, number> = {
  success: 4000,
  info: 4000,
  warning: 4500,
  error: 5500,
};

const MAX_NOTIFICATIONS = 3;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly items = signal<readonly AppNotification[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  readonly notifications = this.items.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => this.clear());
  }

  show(options: ShowNotificationOptions): number {
    const title = options.title.trim();
    const message = options.message?.trim() || undefined;
    if (!title && !message) return -1;

    const existing = this.items().find(
      (item) => item.variant === options.variant && item.title === title && item.message === message,
    );
    const durationMs = options.durationMs ?? DEFAULT_DURATION_MS[options.variant];

    if (existing) {
      this.scheduleAutoDismiss(existing.id, durationMs);
      return existing.id;
    }

    const id = this.nextId++;
    const notification: AppNotification = {
      id,
      variant: options.variant,
      title,
      message,
      dismissible: options.dismissible ?? true,
    };

    const current = this.items();
    if (current.length >= MAX_NOTIFICATIONS) {
      const removed = current.slice(0, current.length - MAX_NOTIFICATIONS + 1);
      for (const old of removed) {
        this.clearTimer(old.id);
      }
      this.items.set([...current.slice(removed.length), notification]);
    } else {
      this.items.set([...current, notification]);
    }

    this.scheduleAutoDismiss(id, durationMs);
    return id;
  }

  success(title: string, message?: string, durationMs?: number): number {
    return this.show({ variant: 'success', title, message, durationMs });
  }

  info(title: string, message?: string, durationMs?: number): number {
    return this.show({ variant: 'info', title, message, durationMs });
  }

  warning(title: string, message?: string, durationMs?: number): number {
    return this.show({ variant: 'warning', title, message, durationMs });
  }

  error(title: string, message?: string, durationMs?: number): number {
    return this.show({ variant: 'error', title, message, durationMs });
  }

  dismiss(id: number): void {
    this.clearTimer(id);
    this.items.update((list) => list.filter((item) => item.id !== id));
  }

  clear(): void {
    for (const id of this.timers.keys()) {
      clearTimeout(this.timers.get(id));
    }
    this.timers.clear();
    this.items.set([]);
  }

  private scheduleAutoDismiss(id: number, durationMs: number): void {
    this.clearTimer(id);
    if (durationMs <= 0) return;
    const timer = setTimeout(() => {
      this.timers.delete(id);
      this.items.update((list) => list.filter((item) => item.id !== id));
    }, durationMs);
    this.timers.set(id, timer);
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}
