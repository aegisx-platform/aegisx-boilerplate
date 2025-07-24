# Feature Toggle Examples

## Real-World Implementation Examples

### Example 1: Dark Mode Implementation

#### Backend API
```typescript
// routes/theme.routes.ts
import { createFeatureToggleMiddleware } from '@/domains/config-management';

export async function themeRoutes(fastify: FastifyInstance) {
  // Protect dark mode endpoints
  fastify.get('/api/v1/theme/dark-mode-config', {
    preHandler: createFeatureToggleMiddleware({
      featureName: 'ui:dark_mode',
      disabledResponse: {
        statusCode: 200,
        data: { darkModeEnabled: false }
      }
    })
  }, async (request, reply) => {
    return reply.send({
      darkModeEnabled: true,
      theme: {
        primary: '#1a1a1a',
        secondary: '#2d2d2d',
        text: '#ffffff'
      }
    });
  });
}
```

#### Angular Component
```typescript
// dark-mode-toggle.component.ts
import { Component, OnInit } from '@angular/core';
import { FeatureToggleService } from '@/features/configuration/services/feature-toggle.service';

@Component({
  selector: 'app-dark-mode-toggle',
  template: `
    <div class="theme-switcher" *featureToggle="'ui:dark_mode'">
      <label class="switch">
        <input type="checkbox" 
               [(ngModel)]="isDarkMode" 
               (change)="toggleTheme()">
        <span class="slider"></span>
      </label>
      <span>Dark Mode</span>
    </div>
  `
})
export class DarkModeToggleComponent implements OnInit {
  isDarkMode = false;

  constructor(
    private featureToggle: FeatureToggleService,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    // Check if dark mode is enabled
    this.featureToggle.isFeatureEnabled('ui:dark_mode').subscribe(
      enabled => {
        if (enabled) {
          this.isDarkMode = this.themeService.getCurrentTheme() === 'dark';
        }
      }
    );
  }

  toggleTheme() {
    this.themeService.setTheme(this.isDarkMode ? 'dark' : 'light');
  }
}
```

### Example 2: API Version Migration

#### Backend Implementation
```typescript
// domains/api-versioning/middleware.ts
export function createApiVersionMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const useV2 = await checkFeatureToggle(request, 'api:v2_endpoints');
    
    // Add version to request context
    request.apiVersion = useV2 ? 'v2' : 'v1';
    
    // Set response header
    reply.header('X-API-Version', request.apiVersion);
  };
}

// routes/users.routes.ts
fastify.get('/api/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  
  if (request.apiVersion === 'v2') {
    // V2 response with more data
    const user = await userService.getUserWithRelations(id);
    return reply.send({
      data: user,
      meta: {
        version: 'v2',
        includedRelations: ['profile', 'permissions', 'organizations']
      }
    });
  } else {
    // V1 response (backward compatible)
    const user = await userService.getUser(id);
    return reply.send({ user });
  }
});
```

#### Angular Service
```typescript
// user.service.ts
@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    private http: HttpClient,
    private featureToggle: FeatureToggleService
  ) {}

  getUser(id: string): Observable<any> {
    return this.featureToggle.isFeatureEnabled('api:v2_endpoints').pipe(
      switchMap(useV2 => {
        if (useV2) {
          return this.http.get(`/api/users/${id}`).pipe(
            map(response => response.data) // V2 response structure
          );
        } else {
          return this.http.get(`/api/users/${id}`).pipe(
            map(response => response.user) // V1 response structure
          );
        }
      })
    );
  }
}
```

### Example 3: Progressive Feature Rollout

#### Backend with Percentage Rollout
```typescript
// services/feature-rollout.service.ts
export class FeatureRolloutService {
  async isFeatureEnabledForUser(
    featureName: string,
    userId: string,
    rolloutPercentage: number = 100
  ): Promise<boolean> {
    // First check if feature is globally enabled
    const globalEnabled = await this.configService.isFeatureEnabled(featureName);
    if (!globalEnabled) return false;
    
    // Check if user is in rollout percentage
    const userHash = this.hashUserId(userId);
    const userPercentage = (userHash % 100) + 1;
    
    return userPercentage <= rolloutPercentage;
  }
  
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Usage in route
fastify.get('/api/v1/beta-feature', async (request, reply) => {
  const rolloutService = new FeatureRolloutService();
  const enabled = await rolloutService.isFeatureEnabledForUser(
    'beta_dashboard',
    request.user.id,
    25 // 25% rollout
  );
  
  if (!enabled) {
    return reply.send({ 
      available: false, 
      message: 'This feature is being gradually rolled out' 
    });
  }
  
  // Beta feature logic
});
```

### Example 4: A/B Testing

#### Angular Component with A/B Test
```typescript
// product-card.component.ts
@Component({
  selector: 'app-product-card',
  template: `
    <!-- Version A: Traditional Layout -->
    <div *featureToggle="'ui:new_product_card'; inverse: true" 
         class="product-card-traditional">
      <img [src]="product.image" [alt]="product.name">
      <h3>{{ product.name }}</h3>
      <p>{{ product.price | currency }}</p>
      <button (click)="addToCart()">Add to Cart</button>
    </div>
    
    <!-- Version B: New Layout -->
    <div *featureToggle="'ui:new_product_card'" 
         class="product-card-modern">
      <div class="card-header">
        <img [src]="product.image" [alt]="product.name">
        <div class="quick-actions">
          <button (click)="quickView()">Quick View</button>
          <button (click)="addToWishlist()">♥</button>
        </div>
      </div>
      <div class="card-body">
        <h3>{{ product.name }}</h3>
        <div class="rating">★★★★☆ ({{ product.reviews }})</div>
        <p class="price">{{ product.price | currency }}</p>
        <button class="cta-button" (click)="addToCart()">
          Add to Cart
        </button>
      </div>
    </div>
  `
})
export class ProductCardComponent implements OnInit {
  @Input() product!: Product;
  private isNewDesign = false;

  constructor(
    private featureToggle: FeatureToggleService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit() {
    this.featureToggle.isFeatureEnabled('ui:new_product_card').subscribe(
      enabled => {
        this.isNewDesign = enabled;
        // Track which version user sees
        this.analytics.track('product_card_viewed', {
          version: enabled ? 'B' : 'A',
          productId: this.product.id
        });
      }
    );
  }

  addToCart() {
    // Track conversion by version
    this.analytics.track('add_to_cart', {
      productId: this.product.id,
      cardVersion: this.isNewDesign ? 'B' : 'A',
      price: this.product.price
    });
    
    // Add to cart logic
  }
}
```

### Example 5: Feature Toggle with User Permissions

#### Combined Feature Toggle and RBAC
```typescript
// middleware/feature-permission.middleware.ts
export function requireFeatureAndPermission(
  featureName: string,
  permission: string
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Check feature toggle
    const featureEnabled = await checkFeatureToggle(request, featureName);
    if (!featureEnabled) {
      return reply.status(404).send({
        message: 'Feature not available'
      });
    }
    
    // Check user permission
    const hasPermission = await request.authorize(permission);
    if (!hasPermission) {
      return reply.status(403).send({
        message: 'Insufficient permissions'
      });
    }
  };
}

// Usage
fastify.post('/api/v1/admin/bulk-import', {
  preHandler: [
    fastify.authenticate,
    requireFeatureAndPermission('admin:bulk_import', 'users:import')
  ]
}, bulkImportHandler);
```

### Example 6: Emergency Feature Kill Switch

#### Emergency Disable System
```typescript
// services/emergency-control.service.ts
export class EmergencyControlService {
  private readonly EMERGENCY_FEATURES = [
    'payment:processing',
    'api:external_integration',
    'notifications:push'
  ];

  async activateEmergencyMode(reason: string, duration?: number) {
    const updates: Record<string, boolean> = {};
    
    // Disable all emergency features
    for (const feature of this.EMERGENCY_FEATURES) {
      updates[feature] = false;
    }
    
    // Apply changes
    await this.configService.bulkUpdateFeatureToggles(
      updates,
      'production',
      `EMERGENCY: ${reason}`
    );
    
    // Set auto-recovery if duration specified
    if (duration) {
      setTimeout(async () => {
        await this.deactivateEmergencyMode('Auto-recovery after timeout');
      }, duration);
    }
    
    // Send alerts
    await this.notificationService.sendAlert({
      level: 'critical',
      message: `Emergency mode activated: ${reason}`,
      features: this.EMERGENCY_FEATURES
    });
  }
}

// Angular Emergency Component
@Component({
  selector: 'app-emergency-control',
  template: `
    <div class="emergency-panel" *ngIf="isAdmin">
      <h3>Emergency Controls</h3>
      
      <div class="status" [class.active]="emergencyMode">
        <span>Emergency Mode: {{ emergencyMode ? 'ACTIVE' : 'Inactive' }}</span>
      </div>
      
      <button class="emergency-button" 
              (click)="activateEmergency()"
              [disabled]="emergencyMode">
        ACTIVATE EMERGENCY MODE
      </button>
      
      <button class="recovery-button"
              (click)="deactivateEmergency()"
              [disabled]="!emergencyMode">
        Deactivate Emergency Mode
      </button>
      
      <div class="affected-features" *ngIf="emergencyMode">
        <h4>Disabled Features:</h4>
        <ul>
          <li>Payment Processing</li>
          <li>External API Integrations</li>
          <li>Push Notifications</li>
        </ul>
      </div>
    </div>
  `
})
export class EmergencyControlComponent {
  emergencyMode = false;
  isAdmin = false;

  constructor(
    private featureToggle: FeatureToggleService,
    private auth: AuthService
  ) {
    this.isAdmin = this.auth.hasRole('admin');
    this.checkEmergencyStatus();
  }

  checkEmergencyStatus() {
    // Check if any emergency feature is disabled
    const emergencyFeatures = [
      'payment:processing',
      'api:external_integration',
      'notifications:push'
    ];

    forkJoin(
      emergencyFeatures.map(f => 
        this.featureToggle.isFeatureEnabled(f, 'production')
      )
    ).subscribe(results => {
      this.emergencyMode = results.some(enabled => !enabled);
    });
  }

  activateEmergency() {
    if (confirm('Are you sure you want to activate emergency mode?')) {
      // Call emergency API endpoint
      this.http.post('/api/v1/admin/emergency/activate', {
        reason: prompt('Enter reason for activation:'),
        duration: 3600000 // 1 hour auto-recovery
      }).subscribe(() => {
        this.checkEmergencyStatus();
      });
    }
  }
}
```

### Example 7: Mobile App Feature Sync

#### Mobile Feature Configuration
```typescript
// Angular Service for Mobile App
@Injectable({
  providedIn: 'root'
})
export class MobileFeatureService {
  private featureCache = new Map<string, boolean>();

  constructor(
    private featureToggle: FeatureToggleService,
    private storage: StorageService
  ) {}

  async syncMobileFeatures(): Promise<MobileFeatureConfig> {
    // Get all mobile features
    const features = await this.featureToggle
      .getAllFeatureToggles('production')
      .toPromise();
    
    // Filter mobile features
    const mobileFeatures = Object.entries(features)
      .filter(([key]) => key.startsWith('mobile:'))
      .reduce((acc, [key, value]) => ({
        ...acc,
        [key.replace('mobile:', '')]: value
      }), {});
    
    // Save to local storage for offline use
    await this.storage.set('mobile_features', mobileFeatures);
    
    return {
      features: mobileFeatures,
      syncedAt: new Date().toISOString(),
      environment: 'production'
    };
  }

  // Check feature with offline fallback
  async isFeatureEnabled(feature: string): Promise<boolean> {
    const fullFeatureName = `mobile:${feature}`;
    
    try {
      // Try online check
      const enabled = await this.featureToggle
        .isFeatureEnabled(fullFeatureName)
        .toPromise();
      
      this.featureCache.set(feature, enabled);
      return enabled;
    } catch (error) {
      // Offline fallback
      const cached = this.featureCache.get(feature);
      if (cached !== undefined) return cached;
      
      const stored = await this.storage.get('mobile_features');
      return stored?.[feature] ?? false;
    }
  }
}

// Mobile Component
@Component({
  selector: 'app-mobile-home',
  template: `
    <ion-content>
      <div *featureToggle="'mobile:offline_mode'" 
           class="offline-indicator"
           [class.active]="!isOnline">
        Offline Mode Active
      </div>
      
      <ion-button *featureToggle="'mobile:biometric_auth'"
                  (click)="enableBiometric()">
        Enable Biometric Login
      </ion-button>
      
      <ion-card *featureToggle="'mobile:push_notifications'">
        <ion-card-content>
          <ion-toggle [(ngModel)]="pushEnabled">
            Push Notifications
          </ion-toggle>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `
})
export class MobileHomeComponent {
  isOnline = navigator.onLine;
  pushEnabled = false;

  constructor(
    private mobileFeatures: MobileFeatureService
  ) {
    // Sync features on startup
    this.mobileFeatures.syncMobileFeatures();
  }
}
```

## Summary

These examples demonstrate various real-world scenarios for using feature toggles:

1. **UI Changes**: Dark mode, layout variations
2. **API Versioning**: Gradual migration to new API versions
3. **Progressive Rollout**: Percentage-based feature deployment
4. **A/B Testing**: Testing different implementations
5. **Permission Integration**: Combining features with user permissions
6. **Emergency Controls**: Quick feature disabling in production
7. **Mobile Sync**: Offline-capable feature flags for mobile apps

Each example shows both backend and frontend implementation, demonstrating the full integration of the feature toggle system across the application stack.