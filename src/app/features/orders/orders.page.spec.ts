import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrdersPage } from './orders.page';
import { DemoAccountStateService } from '../../core/services/demo-account-state.service';

describe('OrdersPage', () => {
  let component: OrdersPage;
  let fixture: ComponentFixture<OrdersPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [provideRouter([]), DemoAccountStateService]
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should list demo orders', () => {
    expect(component.orders().length).toBeGreaterThan(0);
  });
});
