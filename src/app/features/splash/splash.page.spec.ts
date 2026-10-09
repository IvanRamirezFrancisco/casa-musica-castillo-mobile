import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SplashPage } from './splash.page';
import { Router } from '@angular/router';

describe('SplashPage', () => {
  let component: SplashPage;
  let fixture: ComponentFixture<SplashPage>;
  let routerSpy: any;

  beforeEach(async () => {
    routerSpy = { navigate: vi.fn(), };

    await TestBed.configureTestingModule({
      imports: [SplashPage],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SplashPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to login after timeout', () => {
    vi.useFakeTimers();
    fixture.detectChanges(); // triggers ngOnInit
    vi.advanceTimersByTime(2500);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });
});
