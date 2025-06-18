import { Static } from '@sinclair/typebox';
import {
  CreateRoleSchema,
  UpdateRoleSchema,
  AssignRoleSchema,
  AssignPermissionsSchema
} from '../schemas/rbac-schemas';

// Request types derived from schemas
export type CreateRole = Static<typeof CreateRoleSchema>;
export type UpdateRole = Static<typeof UpdateRoleSchema>;
export type AssignRole = Static<typeof AssignRoleSchema>;
export type AssignPermissions = Static<typeof AssignPermissionsSchema>;