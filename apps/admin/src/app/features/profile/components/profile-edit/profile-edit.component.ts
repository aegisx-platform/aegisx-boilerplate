import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { ProfileService, UserProfile } from '../../services/profile.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TabsModule,
    PasswordModule,
    ToastModule,
    MessageModule,
    TagModule,
    DividerModule,
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p class="mt-1 text-sm text-gray-500">Manage your account settings and preferences</p>
        </div>
      </div>

      <!-- Content Card -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <div *ngIf="loading" class="flex justify-center items-center py-12">
          <p-progressSpinner 
            styleClass="w-12 h-12"
            strokeWidth="4">
          </p-progressSpinner>
        </div>

        <p-tabs *ngIf="!loading" [(value)]="activeTab">
          <p-tablist>
            <p-tab value="profile">Profile</p-tab>
            <p-tab value="security">Security</p-tab>
            <p-tab value="roles">Roles & Permissions</p-tab>
          </p-tablist>
          
          <p-tabpanels>
            <!-- Profile Tab -->
            <p-tabpanel value="profile">
            <form [formGroup]="profileForm" (ngSubmit)="updateProfile()" class="space-y-6">
              <!-- Account Information (Read-only) -->
              <div>
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <div class="flex items-center gap-2">
                      <input type="text" 
                             [value]="profile?.email" 
                             readonly
                             class="flex-1 p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-600">
                      <p-tag *ngIf="profile?.is_email_verified"
                             icon="pi pi-check-circle"
                             value="Verified"
                             severity="success">
                      </p-tag>
                      <p-tag *ngIf="!profile?.is_email_verified"
                             icon="pi pi-exclamation-circle"
                             value="Not Verified"
                             severity="warning"
                             class="cursor-pointer"
                             (click)="verifyEmail()"
                             pTooltip="Click to verify email">
                      </p-tag>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <input type="text" 
                           [value]="profile?.username || 'Not set'" 
                           readonly
                           class="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-600">
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Account Created</label>
                    <input type="text" 
                           [value]="formatDate(profile?.created_at)" 
                           readonly
                           class="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-600">
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Last Updated</label>
                    <input type="text" 
                           [value]="formatDate(profile?.updated_at)" 
                           readonly
                           class="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-600">
                  </div>
                </div>
              </div>

              <p-divider></p-divider>

              <!-- Editable Profile Information -->
              <div>
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span class="text-red-500">*</span>
                    </label>
                    <input type="text" 
                           pInputText
                           formControlName="name"
                           placeholder="Enter your full name"
                           class="w-full"
                           [class.ng-invalid]="isFieldInvalid('name')">
                    <small class="text-red-500" *ngIf="isFieldInvalid('name')">
                      Name is required and must be between 2-100 characters
                    </small>
                  </div>
                </div>
              </div>

              <div class="flex justify-end gap-2">
                <button type="button" 
                        pButton 
                        label="Cancel" 
                        class="p-button-secondary"
                        (click)="resetProfileForm()">
                </button>
                
                <button type="submit" 
                        pButton 
                        label="Save Changes" 
                        class="p-button-primary"
                        [loading]="savingProfile"
                        [disabled]="profileForm.invalid || !profileForm.dirty">
                </button>
              </div>
            </form>
            </p-tabpanel>

            <!-- Security Tab -->
            <p-tabpanel value="security">
            <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="space-y-6">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
                
                <div class="max-w-2xl space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Current Password <span class="text-red-500">*</span>
                    </label>
                    <p-password 
                      formControlName="current_password"
                      [toggleMask]="true"
                      [feedback]="false"
                      placeholder="Enter current password"
                      styleClass="w-full"
                      inputStyleClass="w-full">
                    </p-password>
                    <small class="text-red-500" *ngIf="isPasswordFieldInvalid('current_password')">
                      Current password is required
                    </small>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      New Password <span class="text-red-500">*</span>
                    </label>
                    <p-password 
                      formControlName="new_password"
                      [toggleMask]="true"
                      placeholder="Enter new password"
                      styleClass="w-full"
                      inputStyleClass="w-full"
                      [mediumRegex]="'^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$'"
                      [strongRegex]="'^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).{12,}$'">
                    </p-password>
                    <small class="text-red-500" *ngIf="isPasswordFieldInvalid('new_password')">
                      Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number
                    </small>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password <span class="text-red-500">*</span>
                    </label>
                    <p-password 
                      formControlName="confirm_password"
                      [toggleMask]="true"
                      [feedback]="false"
                      placeholder="Confirm new password"
                      styleClass="w-full"
                      inputStyleClass="w-full">
                    </p-password>
                    <small class="text-red-500" *ngIf="isPasswordFieldInvalid('confirm_password')">
                      Passwords must match
                    </small>
                  </div>
                </div>
              </div>

              <div class="flex justify-end gap-2">
                <button type="button" 
                        pButton 
                        label="Cancel" 
                        class="p-button-secondary"
                        (click)="resetPasswordForm()">
                </button>
                
                <button type="submit" 
                        pButton 
                        label="Change Password" 
                        class="p-button-primary"
                        [loading]="changingPassword"
                        [disabled]="passwordForm.invalid">
                </button>
              </div>
            </form>
            </p-tabpanel>

            <!-- Roles & Permissions Tab -->
            <p-tabpanel value="roles">
            <div class="space-y-6">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Your Roles</h3>
                <div class="flex flex-wrap gap-2">
                  <p-tag *ngFor="let role of profile?.roles" 
                         [value]="role | titlecase"
                         severity="info"
                         class="px-3 py-1">
                  </p-tag>
                  <span *ngIf="!profile?.roles?.length" class="text-gray-500">
                    No roles assigned
                  </span>
                </div>
              </div>

              <p-divider></p-divider>

              <div>
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Your Permissions</h3>
                <div class="max-h-96 overflow-y-auto">
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    <div *ngFor="let permission of getSortedPermissions()" 
                         class="flex items-center p-2 bg-gray-50 rounded">
                      <i class="pi pi-check-circle text-green-600 mr-2"></i>
                      <span class="text-sm">{{ formatPermission(permission) }}</span>
                    </div>
                  </div>
                  <p *ngIf="!profile?.permissions?.length" class="text-gray-500">
                    No permissions assigned
                  </p>
                </div>
              </div>
            </div>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </div>
    </div>

    <p-toast></p-toast>
  `,
  styles: [`
    :host ::ng-deep .p-tabpanels {
      padding: 1.5rem 0;
    }
    
    :host ::ng-deep .p-password input {
      width: 100%;
    }
  `]
})
export class ProfileEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  profile: UserProfile | null = null;
  loading = true;
  savingProfile = false;
  changingPassword = false;
  activeTab = 'profile';

  profileForm: FormGroup;
  passwordForm: FormGroup;

  constructor() {
    // Initialize profile form
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]]
    });

    // Initialize password form with custom validator
    this.passwordForm = this.fb.group({
      current_password: ['', [Validators.required]],
      new_password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]*$/)
      ]],
      confirm_password: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loading = true;
    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.profileForm.patchValue({
          name: profile.name
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load profile:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load profile'
        });
        this.loading = false;
      }
    });
  }

  updateProfile() {
    if (this.profileForm.valid && this.profileForm.dirty) {
      this.savingProfile = true;
      this.profileService.updateProfile(this.profileForm.value).subscribe({
        next: (updatedProfile) => {
          this.profile = updatedProfile;
          this.profileForm.markAsPristine();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Profile updated successfully'
          });
          this.savingProfile = false;
        },
        error: (error) => {
          console.error('Failed to update profile:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update profile'
          });
          this.savingProfile = false;
        }
      });
    }
  }

  changePassword() {
    if (this.passwordForm.valid) {
      this.changingPassword = true;
      const { current_password, new_password } = this.passwordForm.value;
      
      this.profileService.changePassword({ current_password, new_password }).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Password changed successfully. Please login again.'
          });
          this.resetPasswordForm();
          this.changingPassword = false;
          
          // Redirect to login after password change
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (error) => {
          console.error('Failed to change password:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Failed to change password'
          });
          this.changingPassword = false;
        }
      });
    }
  }

  verifyEmail() {
    this.profileService.verifyEmail().subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Verification email sent. Please check your inbox.'
        });
        // Reload profile to update verification status
        this.loadProfile();
      },
      error: (error) => {
        console.error('Failed to send verification email:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to send verification email'
        });
      }
    });
  }

  resetProfileForm() {
    this.profileForm.patchValue({
      name: this.profile?.name || ''
    });
    this.profileForm.markAsPristine();
  }

  resetPasswordForm() {
    this.passwordForm.reset();
  }

  isFieldInvalid(field: string): boolean {
    const control = this.profileForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  isPasswordFieldInvalid(field: string): boolean {
    const control = this.passwordForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('new_password')?.value;
    const confirmPassword = form.get('confirm_password')?.value;
    
    if (password !== confirmPassword) {
      form.get('confirm_password')?.setErrors({ passwordMismatch: true });
    } else {
      const errors = form.get('confirm_password')?.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        if (Object.keys(errors).length === 0) {
          form.get('confirm_password')?.setErrors(null);
        }
      }
    }
    return null;
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  }

  getSortedPermissions(): string[] {
    return this.profile?.permissions?.sort() || [];
  }

  formatPermission(permission: string): string {
    // Format permission string like "users:read:own" to "Users - Read (Own)"
    const parts = permission.split(':');
    if (parts.length === 3) {
      const [resource, action, scope] = parts;
      return `${this.capitalize(resource)} - ${this.capitalize(action)} (${this.capitalize(scope)})`;
    }
    return permission;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}