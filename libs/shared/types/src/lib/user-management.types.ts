// Shared types for User Management System
// These types should match the API server types

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type UserRole = 'admin' | 'manager' | 'user' | 'guest';

export interface User {
  id: string;
  email: string;
  name: string; // Changed from fullName to name
  username?: string;
  avatar?: string;
  phone?: string;
  status: string; // Changed from UserStatus to string
  roles?: Role[];
  permissions?: Permission[];
  email_verified_at?: string; // Changed from emailVerified to email_verified_at
  last_login_at?: string; // Changed from lastLoginAt to last_login_at
  created_at: string; // Changed from createdAt to created_at
  updated_at: string; // Changed from updatedAt to updated_at
  metadata?: Record<string, any>;
}

export interface CreateUserRequest {
  email: string;
  name: string; // Changed from fullName to name to match API
  username?: string;
  phone?: string;
  password: string;
  status?: UserStatus; // Add status field for create
  roles?: string[];
  sendWelcomeEmail?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string; // Changed from fullName to name to match API
  username?: string;
  phone?: string;
  avatar?: string;
  status?: UserStatus;
  roles?: string[];
  metadata?: Record<string, any>;
}

export interface UserResponse {
  success: boolean;
  data: User;
  message: string;
}

export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface UserListParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: UserStatus;
  role?: string;
  sortBy?: 'fullName' | 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UserStatsResponse {
  total_users: number;
  active_users: number;
  inactive_users: number;
  suspended_users: number;
  verified_users: number;
  unverified_users: number;
  recent_registrations: number;
}

// Role Management Types
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  scope: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface RoleResponse {
  success: boolean;
  data: Role;
  message: string;
}

export interface RoleListResponse {
  success: boolean;
  data: Role[];
  message: string;
}

export interface PermissionListResponse {
  success: boolean;
  data: Permission[];
  message: string;
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
  expiresAt?: string;
}

export interface UserRoleResponse {
  success: boolean;
  data: {
    userId: string;
    roles: Role[];
  };
  message: string;
}

// Bulk Operations Types
export interface BulkActionRequest {
  user_ids: string[];
  action: 'activate' | 'deactivate' | 'suspend' | 'delete';
  reason?: string;
}

export interface BulkActionResponse {
  success: boolean;
  data: {
    processed: number;
    failed: number;
    results: {
      userId: string;
      success: boolean;
      error?: string;
    }[];
  };
  message: string;
}

// Note: ApiResponse and ApiError are already exported from notification.types.ts

// Authentication Types
export interface LoginRequest {
  identifier: string; // Can be email or username
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    status: string;
    email_verified_at: string;
    created_at: string;
    updated_at: string;
  };
  expires_in: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
  };
  message: string;
}

// Profile Management Types
export interface ProfileResponse {
  success: boolean;
  data: User;
  message: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  username?: string;
  phone?: string;
  avatar?: string;
  metadata?: Record<string, any>;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Cache Management Types
export interface CacheStatsResponse {
  success: boolean;
  data: {
    totalUsers: number;
    cachedUsers: number;
    hitRate: number;
    missRate: number;
    lastUpdated: string;
  };
  message: string;
}