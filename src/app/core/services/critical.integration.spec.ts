import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { CartPage } from '../../features/cart/cart.page';
import { CheckoutSummaryPage } from '../../features/checkout/checkout-summary/checkout-summary.page';
import { EditProfilePage } from '../../features/profile/edit-profile/edit-profile.page';
import { ProfilePage } from '../../features/profile/profile.page';
import { DemoCheckoutStateService } from './demo-checkout-state.service';
import { DemoAccountStateService } from './demo-account-state.service';

describe('INTEGRACIÓN FRONTEND crítica DEMO (no API)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartPage, CheckoutSummaryPage, EditProfilePage, ProfilePage],
      providers: [provideRouter([])],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('HU10-HU11: carrito y resumen comparten cantidades, importe y selección', () => {
    const cart = TestBed.createComponent(CartPage);
    const summary = TestBed.createComponent(CheckoutSummaryPage);
    const service = TestBed.inject(DemoCheckoutStateService);
    cart.componentInstance.updateQuantity('p1', 1);
    summary.detectChanges();
    expect(summary.componentInstance.checkoutService.subtotal()).toBe(24500);
    summary.componentInstance.confirmOrder();
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    service.setDeliveryMethod({ type: 'home', title: 'Domicilio', description: 'Demo', cost: 150 });
    service.setPaymentMethod({ type: 'transfer', title: 'Transferencia', description: 'Demo' });
    summary.detectChanges();
    expect(summary.nativeElement.textContent).toContain('24,650');
    summary.componentInstance.confirmOrder();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/checkout/confirmation']);
  });

  it('HU10: los botones de la plantilla eliminan productos y muestran estado vacío', () => {
    const cart = TestBed.createComponent(CartPage);
    cart.detectChanges();
    const buttons = cart.nativeElement.querySelectorAll('button.remove-btn');
    expect(buttons).toHaveLength(2);
    buttons.forEach((button: HTMLButtonElement) => button.click());
    cart.detectChanges();
    expect(TestBed.inject(DemoCheckoutStateService).cartItems()).toEqual([]);
    expect(cart.nativeElement.textContent).toContain('Tu carrito está vacío');
  });

  it('HU14: editar perfil propaga datos válidos a la pantalla de perfil', () => {
    const edit = TestBed.createComponent(EditProfilePage);
    const profile = TestBed.createComponent(ProfilePage);
    edit.componentInstance.form.setValue({ name: ' QA Local ', email: 'qa@example.test', phone: '5551234567' });
    edit.componentInstance.save();
    profile.detectChanges();
    expect(profile.nativeElement.textContent).toContain('QA Local');
    expect(profile.nativeElement.textContent).toContain('qa@example.test');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/main/profile']);
  });

  it('HU14: un formulario inválido no altera estado ni navega', () => {
    const edit = TestBed.createComponent(EditProfilePage);
    const account = TestBed.inject(DemoAccountStateService);
    const original = { ...account.profile() };
    edit.componentInstance.form.setValue({ name: ' ', email: 'invalid', phone: '12' });
    edit.componentInstance.save();
    expect(account.profile()).toEqual(original);
    expect(edit.componentInstance.form.touched).toBe(true);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });
});
