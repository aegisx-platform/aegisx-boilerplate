import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
  UserListResponse,
  UserListParams,
  UserStatsResponse,
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleResponse,
  RoleListResponse,
  PermissionListResponse,
  AssignRoleRequest,
  UserRoleResponse,
  BulkActionRequest,
  BulkActionResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ProfileResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  CacheStatsResponse,
  ApiResponse,
  ApiError
} from '@aegisx-boilerplate/types';

export interface UserManagementClientConfig {
  baseUrl?: string;
  timeout?: number;
  getAuthToken?: () => string | null;
}

export class UserManagementClient {
  private baseUrl: string;
  private timeout: number;
  private getAuthToken: () => string | null;

  constructor(config: UserManagementClientConfig = {}) {
    this.baseUrl = config.baseUrl || '/api/v1';
    this.timeout = config.timeout || 10000;
    this.getAuthToken = config.getAuthToken || (() => null);
  }

  // Authentication Operations
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('POST', '/auth/login', credentials);
  }

  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.request<RefreshTokenResponse>('POST', '/auth/refresh', request);
  }

  async logout(): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', '/auth/logout');
  }

  async checkToken(): Promise<ApiResponse<{ valid: boolean; user: User }>> {
    return this.request('GET', '/auth/check-token');
  }

  // Profile Management
  async getProfile(): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('GET', '/auth/profile');
  }

  async updateProfile(data: UpdateProfileRequest): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('PUT', '/auth/profile', data);
  }

  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse> {
    return this.request<ApiResponse>('PUT', '/auth/change-password', data);
  }

  async verifyEmail(): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', '/auth/verify-email');
  }

  // User Management Operations
  async getUsers(params?: UserListParams): Promise<UserListResponse> {
    const queryString = params ? '?' + new URLSearchParams(this.mapUserListParams(params)).toString() : '';
    return this.request<UserListResponse>('GET', `/user-management/${queryString}`);
  }

  async getUserById(id: string): Promise<UserResponse> {
    return this.request<UserResponse>('GET', `/user-management/${id}`);
  }

  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    return this.request<UserResponse>('POST', '/user-management/', data);
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<UserResponse> {
    return this.request<UserResponse>('PUT', `/user-management/${id}`, data);
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('DELETE', `/user-management/${id}`);
  }

  async getUserStats(): Promise<UserStatsResponse> {
    return this.request<UserStatsResponse>('GET', '/user-management/stats');
  }

  // User Status Management
  async activateUser(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', `/user-management/${id}/activate`);
  }

  async deactivateUser(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', `/user-management/${id}/deactivate`);
  }

  async suspendUser(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', `/user-management/${id}/suspend`);
  }

  async verifyUserEmail(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', `/user-management/${id}/verify-email`);
  }

  // Bulk Operations
  async bulkAction(data: BulkActionRequest): Promise<BulkActionResponse> {
    return this.request<BulkActionResponse>('POST', '/user-management/bulk-action', data);
  }

  // Role Management
  async getRoles(): Promise<RoleListResponse> {
    return this.request<RoleListResponse>('GET', '/rbac/roles');
  }

  async getRoleById(id: string): Promise<RoleResponse> {
    return this.request<RoleResponse>('GET', `/rbac/roles/${id}`);
  }

  async createRole(data: CreateRoleRequest): Promise<RoleResponse> {
    return this.request<RoleResponse>('POST', '/rbac/roles', data);
  }

  async updateRole(id: string, data: UpdateRoleRequest): Promise<RoleResponse> {
    return this.request<RoleResponse>('PUT', `/rbac/roles/${id}`, data);
  }

  async deleteRole(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('DELETE', `/rbac/roles/${id}`);
  }

  // Permission Management
  async getPermissions(): Promise<PermissionListResponse> {
    return this.request<PermissionListResponse>('GET', '/rbac/permissions');
  }

  async assignPermissionsToRole(roleId: string, permissions: string[]): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', `/rbac/roles/${roleId}/permissions`, { permissions });
  }

  // User Role Management
  async getUserRoles(userId: string): Promise<UserRoleResponse> {
    return this.request<UserRoleResponse>('GET', `/rbac/users/${userId}/roles`);
  }

  async assignRoleToUser(data: AssignRoleRequest): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', `/rbac/users/${data.userId}/roles`, data);
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('DELETE', `/rbac/users/${userId}/roles/${roleId}`);
  }

  async getCurrentUserPermissions(): Promise<ApiResponse<Permission[]>> {
    return this.request('GET', '/rbac/me/permissions');
  }

  // Cache Management
  async invalidateUserCache(userId: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', `/rbac/admin/cache/invalidate-user/${userId}`);
  }

  async invalidateAllCache(): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', '/rbac/admin/cache/invalidate-all');
  }

  async getCacheStats(): Promise<CacheStatsResponse> {
    return this.request<CacheStatsResponse>('GET', '/rbac/admin/cache/stats');
  }

  // Private helper methods
  private mapUserListParams(params: UserListParams): Record<string, string> {
    const cleaned: Record<string, string> = {};
    
    // Map frontend parameters to API parameters
    if (params.limit !== undefined) cleaned['limit'] = String(params.limit);
    if (params.offset !== undefined) cleaned['page'] = String(Math.floor(params.offset / (params.limit || 20)) + 1);
    if (params.search !== undefined && params.search !== '') cleaned['search'] = params.search;
    if (params.status !== undefined) cleaned['status'] = params.status;
    if (params.role !== undefined) cleaned['role'] = params.role;
    if (params.sortBy !== undefined) cleaned['sort_by'] = params.sortBy;
    if (params.sortOrder !== undefined) cleaned['sort_order'] = params.sortOrder;
    
    return cleaned;
  }

  private cleanParams(params: Record<string, any>): Record<string, string> {
    const cleaned: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = String(value);
      }
    });
    return cleaned;
  }

  private async request<T>(method: string, endpoint: string, data?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {};

    // Add authentication token if available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    // Only set Content-Type and body if we have data to send
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorData: ApiError;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            success: false,
            error: `HTTP ${response.status}`,
            message: response.statusText || 'An error occurred'
          };
        }
        throw new UserManagementClientError(errorData.message, response.status, errorData);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof UserManagementClientError) {
        throw error;
      }

      // Handle network errors, timeouts, etc.
      throw new UserManagementClientError(
        error instanceof Error ? error.message : 'Network error occurred',
        0,
        {
          success: false,
          error: 'NetworkError',
          message: error instanceof Error ? error.message : 'Network error occurred'
        }
      );
    }
  }
}

export class UserManagementClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public response: ApiError
  ) {
    super(message);
    this.name = 'UserManagementClientError';
  }
}

// Singleton instance for easy usage
export const userManagementClient = new UserManagementClient();
