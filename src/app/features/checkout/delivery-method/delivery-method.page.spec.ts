import { NavController } from '@ionic/angular';
import { vi } from 'vitest';
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
  it('selects through the native radio and exposes the checked state', () => {
    const root = fixture.nativeElement as HTMLElement;
    const radios = root.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios.length).toBe(2);
    radios[1].click(); fixture.detectChanges();
    expect(component.selectedMethod).toBe('home');
    expect(radios[1].checked).toBe(true);
    expect(radios[0].checked).toBe(false);
    expect(root.querySelectorAll('.selected').length).toBe(1);
  });

  it('usa dirección Ionic back hacia /checkout', () => {
    const back = vi.spyOn(TestBed.inject(NavController), 'navigateBack').mockResolvedValue(true);
    component.goBack();
    expect(back).toHaveBeenCalledWith(['/checkout']);
  });
});
