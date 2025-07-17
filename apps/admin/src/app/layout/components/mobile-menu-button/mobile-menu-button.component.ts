import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mobile-menu-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="fixed top-4 left-4 z-[60] p-3 rounded-md bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow-lg mobile-menu-btn"
      (click)="toggleMenu()"
      aria-label="Toggle mobile menu"
      title="เปิด/ปิด menu"
      [class.hidden]="isMenuOpen"
    >
      <i class="pi pi-bars text-lg"></i>
    </button>
  `,
})
export class MobileMenuButtonComponent {
  @Input() isMenuOpen = false;
  @Output() menuToggle = new EventEmitter<void>();

  toggleMenu() {
    this.menuToggle.emit();
  }
}
