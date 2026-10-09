import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DeliveryMethodPage } from './delivery-method.page';
import { DemoCheckoutStateService } from '../../../core/services/demo-checkout-state.service';

describe('DeliveryMethodPage', () => {
  let component: DeliveryMethodPage;
  let fixture: ComponentFixture<DeliveryMethodPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryMethodPage],
      providers: [
        provideRouter([]),
        DemoCheckoutStateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DeliveryMethodPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select method', () => {
    component.selectMethod('home');
    expect(component.selectedMethod).toBe('home');
  });
});
