import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { OrderDetailPage } from './order-detail.page';
import { DemoAccountStateService } from '../../../core/services/demo-account-state.service';

describe('OrderDetailPage', () => {
  let component: OrderDetailPage;
  let fixture: ComponentFixture<OrderDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDetailPage],
      providers: [
        provideRouter([]),
        DemoAccountStateService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => 'DEMO-1004'
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load order DEMO-1004', () => {
    expect(component.order()?.id).toBe('DEMO-1004');
  });

  it('should compute correct subtotal', () => {
    expect(component.subtotal()).toBe(7200);
  });
});
