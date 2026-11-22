import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { BACKEND_SESSION_ENABLED } from '../../core/config/backend-session.token';
import { AuthService } from '../../core/services/auth.service';
import { CmcBrandLogoDirective } from '../../shared/ui/branding/cmc-brand-logo.directive';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: true,
  imports: [IonContent, CmcBrandLogoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplashPage implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly backendEnabled = inject(BACKEND_SESSION_ENABLED);
  private readonly auth = inject(AuthService);

  private leaving = false;

  ngOnInit() {
    this.destroyRef.onDestroy(() => { this.leaving = true; });
    if (!this.backendEnabled) {
      queueMicrotask(() => {
        if (!this.leaving) void this.router.navigate(['/main/home'], { replaceUrl: true });
      });
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const boundedRestore = Promise.race([
      this.auth.restore().catch(() => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 4000);
      }),
    ]).finally(() => clearTimeout(timer));

    void boundedRestore.then(() => {
      if (!this.leaving) void this.router.navigate(['/main/home'], { replaceUrl: true });
    });
  }

  // Ionic can cache a page after navigation; leaving must cancel startup navigation too.
  ionViewWillLeave(): void { this.leaving = true; }
}
