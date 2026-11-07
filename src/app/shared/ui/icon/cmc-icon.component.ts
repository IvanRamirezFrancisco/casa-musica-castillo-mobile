import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { searchOutline, heartOutline, heart, cartOutline, optionsOutline, closeOutline, musicalNotesOutline, arrowForwardOutline, checkmarkCircleOutline, starOutline, addOutline, removeOutline, eyeOutline, eyeOffOutline, shieldCheckmarkOutline, chevronDownOutline } from 'ionicons/icons';

const icons = { search: searchOutline, heart: heartOutline, saved: heart, cart: cartOutline, filters: optionsOutline, close: closeOutline, music: musicalNotesOutline, arrow: arrowForwardOutline, available: checkmarkCircleOutline, star: starOutline, add: addOutline, remove: removeOutline, eye: eyeOutline, hidden: eyeOffOutline, security: shieldCheckmarkOutline, down: chevronDownOutline };
@Component({selector:'cmc-icon',standalone:true,imports:[IonIcon],template:'<ion-icon [icon]="icons[name()]" aria-hidden="true" />',styles:[':host{display:inline-flex;flex:none;font-size:1.35em;line-height:1;} ion-icon{width:1em;height:1em;}']})
export class CmcIconComponent { readonly name=input.required<keyof typeof icons>(); readonly icons=icons; }
