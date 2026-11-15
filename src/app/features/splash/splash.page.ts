import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: true,
  imports: [IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplashPage implements OnInit {
  private router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  private leaving = false;

  ngOnInit() {
    this.destroyRef.onDestroy(() => { this.leaving = true; });
    queueMicrotask(() => {
      if (!this.leaving) void this.router.navigate(['/main/home'], { replaceUrl: true });
    });
  }
  // Ionic can cache a page after navigation; leaving must cancel startup navigation too.
  ionViewWillLeave(): void { this.leaving = true; }
}
