import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from './layout/components/main-layout.component';

@Component({
  imports: [CommonModule, RouterModule, MainLayoutComponent],
  selector: 'app-root',
  template: `<app-main-layout></app-main-layout>`,
})
export class App {
  protected title = 'AegisX Admin';
}
