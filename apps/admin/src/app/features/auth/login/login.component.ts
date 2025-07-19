import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '@aegisx-boilerplate/types';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <!-- Header -->
        <div class="text-center">
          <div class="flex justify-center">
            <div class="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center">
              <i class="pi pi-shield text-white text-2xl"></i>
            </div>
          </div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to AegisX Admin
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Enter your credentials to access the admin panel
          </p>
        </div>

        <!-- Login Form -->
        <div class="bg-white rounded-lg shadow-md p-8">
          <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
            <div class="space-y-6">
              <!-- Identifier Field -->
              <div>
                <label for="identifier" class="block text-sm font-medium text-gray-700 mb-2">
                  Email or Username
                </label>
                <input
                  id="identifier"
                  type="text"
                  name="identifier"
                  pInputText
                  [(ngModel)]="credentials.identifier"
                  required
                  #identifierField="ngModel"
                  class="w-full"
                  placeholder="admin@example.com or username"
                  [class.p-invalid]="identifierField.invalid && identifierField.touched"
                />
                <div *ngIf="identifierField.invalid && identifierField.touched" class="mt-1">
                  <small *ngIf="identifierField.errors?.['required']" class="text-red-600">
                    Email or username is required
                  </small>
                </div>
              </div>

              <!-- Password Field -->
              <div>
                <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <p-password
                  id="password"
                  name="password"
                  [(ngModel)]="credentials.password"
                  required
                  #passwordField="ngModel"
                  [feedback]="false"
                  [toggleMask]="true"
                  class="w-full"
                  placeholder="Enter your password"
                  [class.p-invalid]="passwordField.invalid && passwordField.touched"
                />
                <div *ngIf="passwordField.invalid && passwordField.touched" class="mt-1">
                  <small *ngIf="passwordField.errors?.['required']" class="text-red-600">
                    Password is required
                  </small>
                </div>
              </div>

              <!-- Remember Me & Forgot Password -->
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    [(ngModel)]="rememberMe"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label for="remember-me" class="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>
                <div class="text-sm">
                  <a href="#" class="font-medium text-indigo-600 hover:text-indigo-500">
                    Forgot your password?
                  </a>
                </div>
              </div>

              <!-- Submit Button -->
              <div>
                <button
                  type="submit"
                  pButton
                  [disabled]="!loginForm.valid || isLoading()"
                  class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <i *ngIf="isLoading()" class="pi pi-spinner pi-spin mr-2"></i>
                  {{ isLoading() ? 'Signing in...' : 'Sign in' }}
                </button>
              </div>
            </div>
          </form>

          <!-- Additional Links -->
          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600">
              Don't have an account?
              <a href="#" class="font-medium text-indigo-600 hover:text-indigo-500">
                Contact administrator
              </a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="text-center">
          <p class="text-xs text-gray-500">
            © 2024 AegisX. All rights reserved.
          </p>
        </div>
      </div>
    </div>

    <!-- Toast Messages -->
    <p-toast position="top-right"></p-toast>
  `
})
export class LoginComponent implements OnInit {
  credentials: LoginRequest = {
    identifier: '',
    password: ''
  };

  rememberMe = false;
  isLoading = signal(false);
  
  private returnUrl = '/dashboard';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    // Get return URL from query params
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Subscribe to loading state from auth service
    this.authService.getAuthState().subscribe(state => {
      this.isLoading.set(state.isLoading);
    });
  }

  async onSubmit() {
    if (this.isLoading()) return;

    try {
      const response = await this.authService.login(this.credentials);
      
      // API returns direct response with access_token
      if (response.access_token) {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Login successful! Redirecting...'
        });
        
        // Navigate to return URL after short delay
        setTimeout(() => {
          this.router.navigateByUrl(this.returnUrl);
        }, 1000);
      }
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Login Failed',
        detail: error.message || 'Invalid credentials. Please try again.'
      });
    }
  }

  // Demo credentials (remove in production)
  fillDemoCredentials() {
    this.credentials = {
      identifier: 'admin@aegisx.com',
      password: 'password123'
    };
  }
}