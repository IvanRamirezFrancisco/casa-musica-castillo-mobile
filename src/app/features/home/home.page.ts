import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IonContent, IonHeader, IonToolbar,   IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline, notificationsOutline, musicalNoteOutline, keypadOutline, ellipseOutline, pulseOutline, heartOutline, imageOutline, musicalNotesOutline } from 'ionicons/icons';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    
    
    IonIcon,
    CurrencyPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  categories = signal<Category[]>([
    { id: '1', name: 'Guitarras', icon: 'musical-note-outline' },
    { id: '2', name: 'Pianos', icon: 'keypad-outline' },
    { id: '3', name: 'Baterías', icon: 'ellipse-outline' },
    { id: '4', name: 'Vientos', icon: 'pulse-outline' },
  ]);

  featuredProducts = signal<Product[]>([
    { id: 'p1', name: 'Guitarra Acústica Yamaha', price: 4500, imageUrl: '', category: 'Guitarras' },
    { id: 'p2', name: 'Teclado Roland GO', price: 7200, imageUrl: '', category: 'Pianos' },
    { id: 'p3', name: 'Batería Pearl Export', price: 15500, imageUrl: '', category: 'Baterías' },
  ]);

  constructor() {
    addIcons({ searchOutline, notificationsOutline, musicalNoteOutline, keypadOutline, ellipseOutline, pulseOutline, heartOutline, imageOutline, musicalNotesOutline });
  }
}
