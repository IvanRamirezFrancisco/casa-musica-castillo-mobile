import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CheckoutSummaryPage } from './checkout-summary.page';
import { DemoCheckoutStateService } from '../../../core/services/demo-checkout-state.service';

describe('CheckoutSummaryPage', () => {
  let component: CheckoutSummaryPage;
  let fixture: ComponentFixture<CheckoutSummaryPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutSummaryPage],
      providers: [
        provideRouter([]),
        DemoCheckoutStateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutSummaryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not allow proceed if missing methods', () => {
    expect(component.canProceed()).toBe(false);
  });

  it('should allow proceed when methods are selected', () => {
    component.checkoutService.setDeliveryMethod({
      type: 'store',
      title: 'Tienda',
      description: 'Test',
      cost: 0
    });
    component.checkoutService.setPaymentMethod({
      type: 'transfer',
      title: 'Trans',
      description: 'Test'
    });
    expect(component.canProceed()).toBe(true);
  });
});
