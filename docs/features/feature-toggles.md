# Feature Toggles Documentation

## Overview

The Feature Toggle system allows you to dynamically enable or disable features in your application without deploying new code. This is useful for:

- A/B testing
- Gradual feature rollouts
- Emergency feature disabling
- Environment-specific features
- Beta testing with specific users

## Architecture

### Backend (API)

The feature toggle system is built on top of the configuration management system with specialized endpoints and middleware.

#### Key Components:

1. **ConfigService** - Extended with feature toggle specific methods
2. **FeatureToggleController** - Handles HTTP requests for feature toggles
3. **Feature Toggle Middleware** - Protects routes based on feature flags
4. **Feature Toggle Routes** - RESTful API endpoints

### Frontend (Angular)

1. **FeatureToggleService** - Angular service for feature flag management
2. **FeatureToggleDirective** - Structural directive for conditional rendering
3. **FeatureToggleComponent** - UI for managing feature toggles

## API Endpoints

### Base URL: `/api/v1/config/feature-toggles`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all feature toggles |
| GET | `/:featureName` | Check specific feature status |
| PUT | `/:featureName` | Enable/disable a feature |
| PUT | `/bulk` | Bulk update features |
| DELETE | `/:featureName` | Delete a feature toggle |
| GET | `/stats` | Get feature toggle statistics |
| GET | `/export` | Export feature configurations |

## Backend Usage

### 1. Using Feature Toggle Middleware

```typescript
import { createFeatureToggleMiddleware } from '@/domains/config-management';

// Protect a single route
fastify.get('/api/v1/beta-feature', {
  preHandler: createFeatureToggleMiddleware({
    featureName: 'beta_dashboard',
    environment: 'production',
    disabledResponse: {
      statusCode: 404,
      message: 'This feature is not available yet'
    }
  })
}, async (request, reply) => {
  // Your route handler
});

// Protect multiple routes
fastify.register(async function(fastify) {
  // All routes in this context require the feature to be enabled
  fastify.addHook('preHandler', createFeatureToggleMiddleware({
    featureName: 'advanced_analytics'
  }));
  
  fastify.get('/analytics/dashboard', analyticsHandler);
  fastify.get('/analytics/reports', reportsHandler);
});
```

### 2. Checking Feature Toggles in Route Handlers

```typescript
import { checkFeatureToggle } from '@/domains/config-management';

fastify.get('/api/v1/dashboard', async (request, reply) => {
  const showNewDashboard = await checkFeatureToggle(request, 'new_dashboard');
  
  if (showNewDashboard) {
    return reply.send({ version: 'v2', features: ['charts', 'widgets'] });
  } else {
    return reply.send({ version: 'v1', features: ['basic'] });
  }
});
```

### 3. Using the Decorator Pattern

```typescript
import { requireFeature } from '@/domains/config-management';

class UserController {
  @requireFeature('user_profile_v2')
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    // This method only executes if user_profile_v2 is enabled
    return reply.send({ profile: 'v2' });
  }
}
```

### 4. Programmatic Feature Toggle Management

```typescript
// In your service or controller
const configService = fastify.configService;

// Check if feature is enabled
const isEnabled = await configService.isFeatureEnabled('dark_mode', 'production');

// Enable a feature
await configService.setFeatureToggle(
  'dark_mode',
  true,
  'production',
  'Enabled dark mode for production'
);

// Get all feature toggles
const allToggles = await configService.getAllFeatureToggles('production');

// Bulk update
await configService.bulkUpdateFeatureToggles({
  'feature1': true,
  'feature2': false,
  'feature3': true
}, 'production', 'Bulk update for release 2.0');
```

## Frontend Usage (Angular)

### 1. Setup

First, ensure the FeatureToggleModule is imported in your module:

```typescript
import { FeatureToggleModule } from '@/shared/directives/feature-toggle.module';

@NgModule({
  imports: [
    CommonModule,
    FeatureToggleModule
  ]
})
export class YourModule { }
```

### 2. Using the Feature Toggle Directive

```html
<!-- Show/hide elements based on feature flags -->
<div *featureToggle="'new_dashboard'">
  <h2>Welcome to the New Dashboard!</h2>
  <!-- New dashboard content -->
</div>

<!-- With environment specification -->
<button *featureToggle="'mobile_app_integration'; environment: 'production'" 
        (click)="syncWithMobile()">
  Sync with Mobile App
</button>

<!-- Inverse condition (show when feature is disabled) -->
<div *featureToggle="'maintenance_mode'; inverse: true">
  <app-normal-content></app-normal-content>
</div>

<!-- With loading and error states -->
<div *featureToggle="'advanced_search'; loading: loading; error: error">
  <app-advanced-search></app-advanced-search>
</div>
<div *ngIf="loading">Checking feature availability...</div>
<div *ngIf="error" class="error">Unable to load feature</div>
```

### 3. Using the Feature Toggle Service

```typescript
import { Component, OnInit } from '@angular/core';
import { FeatureToggleService } from '@/features/configuration/services/feature-toggle.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <div [ngClass]="{ 'dark-mode': isDarkModeEnabled }">
      <h1>Dashboard</h1>
      
      <button *ngIf="canExportData" (click)="exportData()">
        Export Data
      </button>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  isDarkModeEnabled = false;
  canExportData = false;

  constructor(
    private featureToggle: FeatureToggleService
  ) {}

  async ngOnInit() {
    // Check single feature
    this.featureToggle.isFeatureEnabled('dark_mode').subscribe(
      enabled => this.isDarkModeEnabled = enabled
    );

    // Check with specific environment
    this.featureToggle.isFeatureEnabled('data_export', 'production').subscribe(
      enabled => this.canExportData = enabled
    );

    // Get all features
    this.featureToggle.getAllFeatureToggles().subscribe(
      toggles => console.log('All features:', toggles)
    );
  }

  async exportData() {
    // Feature-specific logic
  }
}
```

### 4. Managing Feature Toggles

```typescript
import { Component } from '@angular/core';
import { FeatureToggleService } from '@/features/configuration/services/feature-toggle.service';

@Component({
  selector: 'app-feature-admin',
  template: `
    <div class="feature-controls">
      <h3>Feature Management</h3>
      
      <div *ngFor="let feature of features">
        <label>
          <input type="checkbox" 
                 [checked]="feature.enabled"
                 (change)="toggleFeature(feature.name, $event)">
          {{ feature.name }}
        </label>
      </div>
      
      <button (click)="enableAllFeatures()">Enable All</button>
      <button (click)="disableAllFeatures()">Disable All</button>
    </div>
  `
})
export class FeatureAdminComponent {
  features: any[] = [];

  constructor(
    private featureToggle: FeatureToggleService
  ) {
    this.loadFeatures();
  }

  loadFeatures() {
    this.featureToggle.getAllFeatureToggles().subscribe(
      toggles => {
        this.features = Object.entries(toggles).map(([name, enabled]) => ({
          name,
          enabled
        }));
      }
    );
  }

  toggleFeature(featureName: string, event: any) {
    const enabled = event.target.checked;
    
    this.featureToggle.setFeatureToggle(
      featureName, 
      enabled,
      'development',
      `Manually ${enabled ? 'enabled' : 'disabled'} by admin`
    ).subscribe(
      result => {
        console.log('Feature updated:', result);
        this.loadFeatures();
      }
    );
  }

  enableAllFeatures() {
    const updates = this.features.reduce((acc, f) => ({
      ...acc,
      [f.name]: true
    }), {});

    this.featureToggle.bulkUpdateFeatureToggles(
      updates,
      'development',
      'Enabled all features'
    ).subscribe(() => this.loadFeatures());
  }

  disableAllFeatures() {
    const updates = this.features.reduce((acc, f) => ({
      ...acc,
      [f.name]: false
    }), {});

    this.featureToggle.bulkUpdateFeatureToggles(
      updates,
      'development',
      'Disabled all features'
    ).subscribe(() => this.loadFeatures());
  }
}
```

### 5. Feature Toggle Guard

```typescript
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { FeatureToggleService } from '@/features/configuration/services/feature-toggle.service';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FeatureToggleGuard implements CanActivate {
  constructor(
    private featureToggle: FeatureToggleService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const featureName = route.data['feature'];
    const redirectTo = route.data['redirectTo'] || '/';
    const environment = route.data['environment'] || 'development';

    return this.featureToggle.isFeatureEnabled(featureName, environment).pipe(
      tap(enabled => {
        if (!enabled) {
          this.router.navigate([redirectTo]);
        }
      }),
      map(enabled => enabled)
    );
  }
}

// Usage in routing
const routes: Routes = [
  {
    path: 'beta',
    component: BetaComponent,
    canActivate: [FeatureToggleGuard],
    data: {
      feature: 'beta_features',
      redirectTo: '/home',
      environment: 'production'
    }
  }
];
```

## Best Practices

### 1. Naming Conventions

Use descriptive, hierarchical names:
- `feature_category:specific_feature`
- Examples: `ui:dark_mode`, `api:v2_endpoints`, `mobile:push_notifications`

### 2. Environment Strategy

```typescript
// Development: Test new features
setFeatureToggle('new_feature', true, 'development');

// Staging: Validate before production
setFeatureToggle('new_feature', true, 'staging');

// Production: Gradual rollout
setFeatureToggle('new_feature', false, 'production'); // Start disabled
// Enable for specific users or percentage later
```

### 3. Feature Toggle Categories

Organize features by category:
- **UI Features**: Visual changes, new components
- **API Features**: New endpoints, API versions
- **Mobile Features**: Mobile-specific functionality
- **Security Features**: Authentication, authorization changes
- **Analytics**: Tracking, monitoring features
- **Experimental**: Beta or testing features
- **System**: Infrastructure, performance features

### 4. Clean Code Practices

```typescript
// Good: Descriptive feature names
if (await isFeatureEnabled('user_profile_redesign_v2')) {
  // New profile code
}

// Bad: Unclear names
if (await isFeatureEnabled('feature1')) {
  // What does this do?
}

// Good: Centralized feature flags
const FEATURES = {
  DARK_MODE: 'ui:dark_mode',
  API_V2: 'api:v2_endpoints',
  MOBILE_SYNC: 'mobile:sync_enabled'
} as const;

if (await isFeatureEnabled(FEATURES.DARK_MODE)) {
  // Dark mode logic
}
```

### 5. Testing with Feature Toggles

```typescript
// Test with feature enabled
describe('DashboardComponent', () => {
  beforeEach(() => {
    const featureToggleService = TestBed.inject(FeatureToggleService);
    spyOn(featureToggleService, 'isFeatureEnabled').and.returnValue(
      of(true)
    );
  });

  it('should show new dashboard when feature is enabled', () => {
    // Test new dashboard
  });
});

// Test with feature disabled
describe('DashboardComponent - Feature Disabled', () => {
  beforeEach(() => {
    const featureToggleService = TestBed.inject(FeatureToggleService);
    spyOn(featureToggleService, 'isFeatureEnabled').and.returnValue(
      of(false)
    );
  });

  it('should show old dashboard when feature is disabled', () => {
    // Test old dashboard
  });
});
```

## Migration Guide

### From Static Flags to Dynamic Feature Toggles

Before:
```typescript
// environment.ts
export const environment = {
  production: false,
  features: {
    darkMode: true,
    betaFeatures: false
  }
};

// component.ts
if (environment.features.darkMode) {
  // Dark mode logic
}
```

After:
```typescript
// component.ts
constructor(private featureToggle: FeatureToggleService) {}

ngOnInit() {
  this.featureToggle.isFeatureEnabled('dark_mode').subscribe(
    enabled => {
      if (enabled) {
        // Dark mode logic
      }
    }
  );
}
```

## Monitoring and Analytics

Track feature toggle usage:

```typescript
// Backend
fastify.addHook('onRequest', async (request, reply) => {
  const features = await configService.getAllFeatureToggles();
  
  // Log active features
  request.log.info('Active features', {
    features: Object.entries(features)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name),
    environment: process.env.NODE_ENV
  });
});

// Frontend
export class FeatureAnalyticsService {
  trackFeatureUsage(featureName: string, enabled: boolean) {
    // Send to analytics service
    this.analytics.track('feature_toggle_checked', {
      feature: featureName,
      enabled,
      timestamp: new Date(),
      user: this.currentUser.id
    });
  }
}
```

## Troubleshooting

### Common Issues

1. **Feature not updating**: Clear cache and check hot reload is working
2. **404 on feature toggle API**: Ensure routes are properly registered
3. **Directive not working**: Check FeatureToggleModule is imported
4. **Environment mismatch**: Verify NODE_ENV matches your expectation

### Debug Mode

Enable debug logging:

```typescript
// Backend
fastify.configService.setDebugMode(true);

// Frontend
localStorage.setItem('featureToggleDebug', 'true');
```

## Security Considerations

1. **Authentication**: Always authenticate feature toggle endpoints
2. **Authorization**: Use RBAC to control who can modify features
3. **Audit Trail**: All changes are logged with user and timestamp
4. **Environment Isolation**: Production features require special permissions
5. **Validation**: Feature names are validated against patterns

## Performance

- Feature toggles are cached with configurable TTL
- Hot reload updates cache without restart
- Minimal overhead on route checks
- Bulk operations for efficiency

## Summary

The Feature Toggle system provides a robust, scalable way to manage feature flags across your application. It integrates seamlessly with both backend and frontend code, supports multiple environments, and includes comprehensive audit logging and security features.