import { TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular';
import { describe, expect, it, vi } from 'vitest';
import { ActionDialogComponent } from './action-dialog.component';

describe('ActionDialogComponent dismissal', () => {
  it('keeps a busy action open and requires confirmation before discarding changes', async () => {
    const onDidDismiss = vi.fn().mockResolvedValue({ role: 'cancel' });
    const create = vi.fn().mockResolvedValue({ present: vi.fn(), onDidDismiss });
    TestBed.configureTestingModule({ providers: [{ provide: AlertController, useValue: { create } }] });
    const fixture = TestBed.createComponent(ActionDialogComponent);
    const dialog = fixture.componentInstance;

    fixture.componentRef.setInput('busy', true);
    expect(await dialog.canDismiss()).toBe(false);
    expect(create).not.toHaveBeenCalled();

    fixture.componentRef.setInput('busy', false);
    expect(await dialog.canDismiss()).toBe(true);

    fixture.componentRef.setInput('dirty', true);
    expect(await dialog.canDismiss(undefined, 'backdrop')).toBe(false);
    expect(create).toHaveBeenCalledOnce();

    onDidDismiss.mockResolvedValueOnce({ role: 'destructive' });
    expect(await dialog.canDismiss(undefined, 'backdrop')).toBe(true);
  });
});
