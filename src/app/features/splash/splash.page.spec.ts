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

  it('cancels queued navigation when Splash is destroyed', async () => {
    fixture.detectChanges(); fixture.destroy(); await Promise.resolve();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('does not override another destination when Ionic caches Splash', async () => {
    fixture.detectChanges(); component.ionViewWillLeave(); await Promise.resolve();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('navigates to public home without an artificial delay', async () => {
    fixture.detectChanges(); await Promise.resolve();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/main/home'], { replaceUrl: true });
  });
});
