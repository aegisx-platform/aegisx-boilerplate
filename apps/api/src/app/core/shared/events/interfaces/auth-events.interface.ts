import { DomainEvent } from './domain-event.interface'

// Authentication Event Types
export interface UserRegisteredEvent extends DomainEvent {
  eventType: "auth.user.registered"
  aggregateType: "User"
  data: {
    userId: string
    email: string
    name: string
    registrationIp?: string
    userAgent?: string
    registeredAt: Date
  }
}

export interface UserLoginEvent extends DomainEvent {
  eventType: "auth.user.login"
  aggregateType: "User" 
  data: {
    userId: string
    email: string
    username?: string
    loginIp?: string
    userAgent?: string
    loginAt: Date
    roles: string[]
    permissions: string[]
  }
}

export interface UserLoginFailedEvent extends DomainEvent {
  eventType: "auth.user.login.failed"
  aggregateType: "User"
  data: {
    identifier: string // email or username
    reason: 'invalid_credentials' | 'account_inactive' | 'account_locked'
    loginIp?: string
    userAgent?: string
    attemptedAt: Date
  }
}

export interface UserLogoutEvent extends DomainEvent {
  eventType: "auth.user.logout"
  aggregateType: "User"
  data: {
    userId: string
    email: string
    logoutAt: Date
    sessionDuration?: number // in milliseconds
    logoutType: 'manual' | 'token_revoked' | 'all_devices'
  }
}

export interface TokenRefreshedEvent extends DomainEvent {
  eventType: "auth.token.refreshed"
  aggregateType: "RefreshToken"
  data: {
    userId: string
    oldTokenId?: string
    newTokenId: string
    refreshedAt: Date
    userAgent?: string
    refreshIp?: string
  }
}

export interface PasswordChangedEvent extends DomainEvent {
  eventType: "auth.password.changed"
  aggregateType: "User"
  data: {
    userId: string
    email: string
    changedAt: Date
    changedIp?: string
    userAgent?: string
    allTokensRevoked: boolean
  }
}

export interface EmailVerifiedEvent extends DomainEvent {
  eventType: "auth.email.verified"
  aggregateType: "User"
  data: {
    userId: string
    email: string
    verifiedAt: Date
    verificationIp?: string
    userAgent?: string
  }
}

export interface ProfileUpdatedEvent extends DomainEvent {
  eventType: "auth.profile.updated"
  aggregateType: "User"
  data: {
    userId: string
    changes: Record<string, { old: any, new: any }>
    updatedAt: Date
    updatedBy: string
    updatedIp?: string
    userAgent?: string
  }
}

export interface SecurityAlertEvent extends DomainEvent {
  eventType: "auth.security.alert"
  aggregateType: "Security"
  data: {
    userId?: string
    alertType: 'multiple_failed_logins' | 'suspicious_login' | 'token_theft_detected' | 'password_breach'
    severity: 'low' | 'medium' | 'high' | 'critical'
    details: Record<string, any>
    triggeredAt: Date
    sourceIp?: string
    userAgent?: string
  }
}

// Extend the EventMap to include auth events
declare module './domain-event.interface' {
  interface EventMap {
    "auth.user.registered": UserRegisteredEvent
    "auth.user.login": UserLoginEvent
    "auth.user.login.failed": UserLoginFailedEvent
    "auth.user.logout": UserLogoutEvent
    "auth.token.refreshed": TokenRefreshedEvent
    "auth.password.changed": PasswordChangedEvent
    "auth.email.verified": EmailVerifiedEvent
    "auth.profile.updated": ProfileUpdatedEvent
    "auth.security.alert": SecurityAlertEvent
  }
}