import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    CardModule, 
    ButtonModule, 
    InputTextModule
  ],
  template: `
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
          <p class="mt-1 text-sm text-gray-500">Manage your details and personal preferences here.</p>
        </div>
        <div class="flex items-center space-x-3">
          <button class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            Save changes
          </button>
        </div>
      </div>

      <!-- Settings Tabs -->
      <div class="bg-white rounded-lg border border-gray-200">
        <!-- Tab Headers -->
        <div class="border-b border-gray-200">
          <nav class="flex space-x-8 px-6">
            <button *ngFor="let tab of tabs; let i = index"
                    (click)="activeTab = i"
                    [class.border-indigo-500]="activeTab === i"
                    [class.text-indigo-600]="activeTab === i"
                    [class.border-transparent]="activeTab !== i"
                    [class.text-gray-500]="activeTab !== i"
                    class="py-4 px-1 border-b-2 font-medium text-sm hover:text-gray-700 hover:border-gray-300">
              {{ tab }}
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- My Profile Tab -->
          <div *ngIf="activeTab === 0">
            <div class="space-y-6">
              <!-- Email Verification Notice -->
              <div class="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <i class="pi pi-info-circle text-blue-600 mt-0.5"></i>
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-blue-900">Please confirm your email to publish your profile</h4>
                  <p class="text-sm text-blue-700 mt-1">
                    We sent a 6-digit verification code to hi&#64;florenceshaw.com. 
                    <a href="#" class="font-medium underline">Didn't get the email?</a>
                  </p>
                  <div class="flex items-center space-x-2 mt-3">
                    <input *ngFor="let i of [1,2,3,4,5,6]" 
                           type="text" 
                           maxlength="1"
                           class="w-12 h-12 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <button class="ml-4 px-3 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50">
                      Verify email
                    </button>
                  </div>
                </div>
              </div>

              <!-- Profile Form -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Profile Picture -->
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                  <p class="text-sm text-gray-500 mb-4">This will be displayed on your profile.</p>
                  <div class="flex items-center space-x-4">
                    <img class="w-16 h-16 rounded-full object-cover" 
                         src="https://ui-avatars.com/api/?name=Florence+Shaw&size=64&background=6366f1&color=fff" 
                         alt="Profile">
                    <div class="flex space-x-3">
                      <button class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        Delete
                      </button>
                      <button class="px-3 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50">
                        Upload
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Full Name -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Full name *</label>
                  <p class="text-sm text-gray-500 mb-2">This will be displayed on your profile.</p>
                  <input type="text" 
                         value="Florence Shaw"
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                </div>

                <!-- Profile URL -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Profile URL</label>
                  <div class="flex items-center">
                    <span class="px-3 py-2 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500">
                      uui.com/
                    </span>
                    <input type="text" 
                           value="florence"
                           class="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <button class="ml-3 px-3 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50">
                      Edit
                    </button>
                  </div>
                </div>

                <!-- Contact Email -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Contact email *</label>
                  <p class="text-sm text-gray-500 mb-2">Add at least one contact email.</p>
                  <div class="space-y-2">
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span class="text-sm">hi&#64;florenceshaw.com</span>
                      <button class="text-sm font-medium text-indigo-600 hover:text-indigo-700">Edit</button>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span class="text-sm text-gray-500">f.shaw&#64;gmail.com</span>
                      <button class="text-sm font-medium text-indigo-600 hover:text-indigo-700">Edit</button>
                    </div>
                  </div>
                </div>

                <!-- Business Tax ID -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Business tax ID *</label>
                  <div class="flex items-center">
                    <input type="text" 
                           value="65 655 466 729"
                           class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <i class="pi pi-check-circle text-green-500 ml-2"></i>
                    <button class="ml-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">Edit</button>
                  </div>
                </div>

                <!-- Business Address -->
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Business address *</label>
                  <div class="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p class="text-sm">100 Smith Street</p>
                      <p class="text-sm">Collingwood VIC 3066</p>
                      <p class="text-sm">AUSTRALIA</p>
                    </div>
                    <button class="text-sm font-medium text-indigo-600 hover:text-indigo-700">Edit</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Security Tab -->
          <div *ngIf="activeTab === 1">
            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 class="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Current password</label>
                      <input type="password" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">New password</label>
                      <input type="password" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Confirm password</label>
                      <input type="password" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    </div>
                    <button class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                      Update password
                    </button>
                  </div>
                </div>
                
                <div>
                  <h3 class="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                  <p class="text-sm text-gray-500 mb-4">Add an extra layer of security to your account.</p>
                  <button class="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50">
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Notifications Tab -->
          <div *ngIf="activeTab === 2">
            <div class="space-y-6">
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">Project updates</h4>
                      <p class="text-sm text-gray-500">Get notified when a project is updated</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" class="sr-only peer" checked>
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">Security alerts</h4>
                      <p class="text-sm text-gray-500">Get notified about security issues</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" class="sr-only peer" checked>
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent {
  activeTab = 0;
  tabs = ['My profile', 'Security', 'Notifications'];
}