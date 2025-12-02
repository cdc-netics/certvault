import { Component, Input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <button 
      type="button" 
      class="btn btn-sm btn-outline-secondary"
      [routerLink]="customRoute"
      *ngIf="customRoute; else goBackButton">
      <i class="fas fa-arrow-left me-1"></i>
      {{ label }}
    </button>
    <ng-template #goBackButton>
      <button 
        type="button" 
        class="btn btn-sm btn-outline-secondary"
        (click)="goBack()">
        <i class="fas fa-arrow-left me-1"></i>
        {{ label }}
      </button>
    </ng-template>
  `,
  styles: [`
    button {
      transition: all 0.3s ease;
    }
    button:hover {
      transform: translateX(-2px);
    }
  `]
})
export class BackButtonComponent {
  @Input() label: string = 'Volver';
  @Input() customRoute?: string;

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}