import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartPage } from './cart.page';
import { DemoCheckoutStateService } from '../../core/services/demo-checkout-state.service';
import { NavController } from '@ionic/angular';
import { vi } from 'vitest';

describe('CartPage', () => {
  let component: CartPage;
  let fixture: ComponentFixture<CartPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [
        provideRouter([]),
        {
          provide: NavController,
          useValue: { back: vi.fn(), navigateForward: vi.fn() }
        },
        DemoCheckoutStateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CartPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial cart items', () => {
    expect(component.checkoutService.cartItems().length).toBeGreaterThan(0);
  });

  it('should increment quantity', () => {
    const initialQty = component.checkoutService.cartItems()[0].quantity;
    component.updateQuantity(component.checkoutService.cartItems()[0].id, 1);
    expect(component.checkoutService.cartItems()[0].quantity).toBe(initialQty + 1);
  });

  it('should not decrement below 1', () => {
    const id = component.checkoutService.cartItems()[0].id;
    // Set to 1
    component.updateQuantity(id, -10);
    expect(component.checkoutService.cartItems()[0].quantity).toBe(1);
    // Try to decrement again
    component.updateQuantity(id, -1);
    expect(component.checkoutService.cartItems()[0].quantity).toBe(1);
  });

  it('should remove item', () => {
    const id = component.checkoutService.cartItems()[0].id;
    component.removeItem(id);
    expect(component.checkoutService.cartItems().find(i => i.id === id)).toBeUndefined();
  });
});
