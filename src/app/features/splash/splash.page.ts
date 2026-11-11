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

  private timer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit() {
    this.timer = setTimeout(() => {
      this.router.navigate(['/main/home'], { replaceUrl: true });
    }, 2500);
    this.destroyRef.onDestroy(() => this.stopTimer());
  }
  // Ionic can cache a page after navigation; leaving must cancel startup navigation too.
  ionViewWillLeave(): void { this.stopTimer(); }
  private stopTimer(): void {
    if (this.timer !== undefined) { clearTimeout(this.timer); this.timer = undefined; }
  }
}
