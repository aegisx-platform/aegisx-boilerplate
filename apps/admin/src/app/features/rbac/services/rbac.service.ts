import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, map } from 'rxjs';
import { 
  Role, 
  Permission, 
  UserRole, 
  CreateRoleRequest, 
  UpdateRoleRequest,
  AssignPermissionsRequest,
  AssignRoleRequest,
  RoleStats,
  PermissionGroup
} from '../types/rbac.types';

@Injectable({
  providedIn: 'root'
})
export class RbacService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/v1/rbac';
  
  // Cache subjects
  private rolesSubject = new BehaviorSubject<Role[]>([]);
  private permissionsSubject = new BehaviorSubject<Permission[]>([]);
  
  roles$ = this.rolesSubject.asObservable();
  permissions$ = this.permissionsSubject.asObservable();

  // Role Management
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/roles`).pipe(
      tap(roles => this.rolesSubject.next(roles))
    );
  }

  getRole(id: string): Observable<Role> {
    return this.http.get<Role>(`${this.apiUrl}/roles/${id}`);
  }

  createRole(data: CreateRoleRequest): Observable<Role> {
    return this.http.post<Role>(`${this.apiUrl}/roles`, data).pipe(
      tap(() => this.getRoles().subscribe())
    );
  }

  updateRole(id: string, data: UpdateRoleRequest): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/roles/${id}`, data).pipe(
      tap(() => this.getRoles().subscribe())
    );
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/roles/${id}`).pipe(
      tap(() => this.getRoles().subscribe())
    );
  }

  // Permission Management
  getPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/permissions`).pipe(
      tap(permissions => this.permissionsSubject.next(permissions))
    );
  }

  assignPermissionsToRole(roleId: string, data: AssignPermissionsRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/roles/${roleId}/permissions`, data).pipe(
      tap(() => this.getRoles().subscribe())
    );
  }

  // User Role Management
  getUserRoles(userId: string): Observable<UserRole[]> {
    return this.http.get<UserRole[]>(`${this.apiUrl}/users/${userId}/roles`);
  }

  assignRoleToUser(userId: string, data: AssignRoleRequest): Observable<UserRole> {
    return this.http.post<UserRole>(`${this.apiUrl}/users/${userId}/roles`, data);
  }

  removeRoleFromUser(userId: string, roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}/roles/${roleId}`);
  }

  getCurrentUserPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/me/permissions`);
  }

  // Cache Management
  invalidateUserCache(userId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/admin/cache/invalidate-user/${userId}`, {});
  }

  invalidateAllCache(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/admin/cache/invalidate-all`, {});
  }

  getCacheStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/cache/stats`);
  }

  // UI Helper Methods
  getGroupedPermissions(): Observable<PermissionGroup[]> {
    return this.permissions$.pipe(
      map(permissions => {
        const groups = permissions.reduce((acc, permission) => {
          if (!acc[permission.resource]) {
            acc[permission.resource] = [];
          }
          acc[permission.resource].push(permission);
          return acc;
        }, {} as Record<string, Permission[]>);

        return Object.entries(groups).map(([resource, permissions]) => ({
          resource,
          permissions: permissions.sort((a, b) => {
            const actionOrder = ['read', 'create', 'update', 'delete', 'assign'];
            const scopeOrder = ['own', 'department', 'all'];
            
            const actionDiff = actionOrder.indexOf(a.action) - actionOrder.indexOf(b.action);
            if (actionDiff !== 0) return actionDiff;
            
            return scopeOrder.indexOf(a.scope) - scopeOrder.indexOf(b.scope);
          })
        })).sort((a, b) => a.resource.localeCompare(b.resource));
      })
    );
  }

  getRoleStats(): Observable<RoleStats> {
    return this.roles$.pipe(
      map(roles => ({
        total_roles: roles.length,
        active_roles: roles.filter(r => r.is_active).length,
        total_users: roles.reduce((sum, role) => sum + (role.user_count || 0), 0),
        total_permissions: this.permissionsSubject.value.length
      }))
    );
  }

  // Permission formatting helper
  formatPermission(permission: Permission): string {
    return `${permission.resource}:${permission.action}:${permission.scope}`;
  }

  getPermissionIcon(action: string): string {
    const icons: Record<string, string> = {
      'read': 'pi-eye',
      'create': 'pi-plus',
      'update': 'pi-pencil',
      'delete': 'pi-trash',
      'assign': 'pi-users'
    };
    return icons[action] || 'pi-circle';
  }

  getPermissionColor(action: string): string {
    const colors: Record<string, string> = {
      'read': 'blue',
      'create': 'green',
      'update': 'orange',
      'delete': 'red',
      'assign': 'purple'
    };
    return colors[action] || 'gray';
  }
}