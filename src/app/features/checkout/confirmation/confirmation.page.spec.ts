import { NavController } from '@ionic/angular';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Router, provideRouter } from '@angular/router';
import { ConfirmationPage } from './confirmation.page';
import { DemoCheckoutStateService } from '../../../core/services/demo-checkout-state.service';

describe('ConfirmationPage', () => {
  let component: ConfirmationPage;
  let fixture: ComponentFixture<ConfirmationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationPage],
      providers: [
        provideRouter([]),
        DemoCheckoutStateService
      ]
    }).compileComponents();

    const checkoutService = TestBed.inject(DemoCheckoutStateService);
    checkoutService.setDeliveryMethod({
      type: 'store',
      title: 'Store',
      description: 'Desc',
      cost: 0
    });
    checkoutService.setPaymentMethod({
      type: 'transfer',
      title: 'Transfer',
      description: 'Desc'
    });

    fixture = TestBed.createComponent(ConfirmationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display demo order id', () => {
    expect(component.order()?.id).toContain('DEMO-');
  });
  it('returns incomplete direct navigation to checkout without rendering an invalid order', () => {
    TestBed.inject(DemoCheckoutStateService).clearCheckout();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const direct = TestBed.createComponent(ConfirmationPage);
    expect(() => direct.detectChanges()).not.toThrow();
    expect(direct.componentInstance.order()).toBeNull();
    expect((direct.nativeElement as HTMLElement).querySelector('.confirmation-summary')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/checkout'], { replaceUrl: true });
  });
  it.each(['home', 'orders'])('sale de confirmación con raíz Ionic hacia %s', (destination) => {
    const root = vi.spyOn(TestBed.inject(NavController), 'navigateRoot').mockResolvedValue(true);
    if (destination === 'home') component.goToHome();
    else component.goToOrders();
    expect(root).toHaveBeenCalledWith([`/main/${destination}`], { replaceUrl: true });
  });
});
