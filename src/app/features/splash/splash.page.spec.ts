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

  it('cancels delayed navigation after leaving Splash', () => {
    vi.useFakeTimers(); fixture.detectChanges(); fixture.destroy(); vi.advanceTimersByTime(2500);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('does not override another destination when Ionic caches Splash', () => {
    vi.useFakeTimers(); fixture.detectChanges(); component.ionViewWillLeave(); vi.advanceTimersByTime(2500);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to public home after timeout', () => {
    vi.useFakeTimers();
    fixture.detectChanges(); // triggers ngOnInit
    vi.advanceTimersByTime(2500);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/main/home'], { replaceUrl: true });
  });
});
