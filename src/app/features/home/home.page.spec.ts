import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomePage } from './home.page';
import { provideRouter } from '@angular/router';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have categories initialized', () => {
    expect(component.categories().length).toBeGreaterThan(0);
  });

  it('should have featured products initialized', () => {
    expect(component.featuredProducts().length).toBeGreaterThan(0);
  });
});
