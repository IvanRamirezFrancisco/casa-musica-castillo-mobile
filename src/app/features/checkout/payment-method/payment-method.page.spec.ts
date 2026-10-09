import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PaymentMethodPage } from './payment-method.page';
import { DemoCheckoutStateService } from '../../../core/services/demo-checkout-state.service';

describe('PaymentMethodPage', () => {
  let component: PaymentMethodPage;
  let fixture: ComponentFixture<PaymentMethodPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentMethodPage],
      providers: [
        provideRouter([]),
        DemoCheckoutStateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentMethodPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select method', () => {
    component.selectMethod('mercadopago');
    expect(component.selectedMethod).toBe('mercadopago');
  });
});
