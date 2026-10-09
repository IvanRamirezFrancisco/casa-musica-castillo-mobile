import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
});
