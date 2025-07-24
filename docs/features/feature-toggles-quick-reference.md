# Feature Toggles Quick Reference

## 🚀 Quick Start

### Backend Setup
```typescript
// Protect a route
fastify.get('/api/beta', {
  preHandler: createFeatureToggleMiddleware({
    featureName: 'beta_feature'
  })
}, handler);

// Check in code
const enabled = await checkFeatureToggle(request, 'feature_name');
```

### Angular Setup
```html
<!-- Show/hide with directive -->
<div *featureToggle="'feature_name'">Content</div>

<!-- Opposite condition -->
<div *featureToggle="'feature_name'; inverse: true">Content</div>
```

```typescript
// In component
constructor(private featureToggle: FeatureToggleService) {}

ngOnInit() {
  this.featureToggle.isFeatureEnabled('feature_name').subscribe(
    enabled => console.log('Feature enabled:', enabled)
  );
}
```

## 📋 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/v1/config/feature-toggles` | Get all toggles |
| `GET` | `/api/v1/config/feature-toggles/:name` | Check specific |
| `PUT` | `/api/v1/config/feature-toggles/:name` | Enable/disable |
| `PUT` | `/api/v1/config/feature-toggles/bulk` | Bulk update |
| `DELETE` | `/api/v1/config/feature-toggles/:name` | Delete toggle |

## 🔧 Common Patterns

### Conditional Routes
```typescript
// Route guard
{
  path: 'beta',
  component: BetaComponent,
  canActivate: [FeatureToggleGuard],
  data: { feature: 'beta_features' }
}
```

### Conditional Services
```typescript
@Injectable()
export class PaymentService {
  constructor(private featureToggle: FeatureToggleService) {}
  
  processPayment(data: PaymentData) {
    return this.featureToggle.isFeatureEnabled('new_payment_flow').pipe(
      switchMap(enabled => enabled ? 
        this.processV2Payment(data) : 
        this.processV1Payment(data)
      )
    );
  }
}
```

### Environment-Specific
```typescript
// Development only
this.featureToggle.isFeatureEnabled('debug_mode', 'development')

// Production rollout
this.featureToggle.isFeatureEnabled('new_feature', 'production')
```

## 🏷️ Naming Conventions

| Category | Pattern | Example |
|----------|---------|---------|
| UI | `ui:feature_name` | `ui:dark_mode` |
| API | `api:feature_name` | `api:v2_endpoints` |
| Mobile | `mobile:feature_name` | `mobile:offline_sync` |
| Security | `security:feature_name` | `security:two_factor` |
| System | `system:feature_name` | `system:auto_scaling` |

## 🎛️ Management Commands

```bash
# Enable feature
curl -X PUT http://localhost:3000/api/v1/config/feature-toggles/dark_mode \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Disable feature  
curl -X PUT http://localhost:3000/api/v1/config/feature-toggles/dark_mode \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Bulk update
curl -X PUT http://localhost:3000/api/v1/config/feature-toggles/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "updates": {
      "feature1": true,
      "feature2": false
    }
  }'
```

## 🔍 Testing

```typescript
// Mock feature toggle service
beforeEach(() => {
  const featureToggleService = TestBed.inject(FeatureToggleService);
  spyOn(featureToggleService, 'isFeatureEnabled').and.returnValue(
    of(true) // or of(false)
  );
});
```

## 🚨 Emergency Disable

```typescript
// Disable all features quickly
await configService.bulkUpdateFeatureToggles({
  'payment:processing': false,
  'api:external_calls': false,
  'notifications:push': false
}, 'production', 'EMERGENCY: System overload');
```

## 🔒 Security Notes

- ✅ Always authenticate feature toggle endpoints
- ✅ Use RBAC for modification permissions
- ✅ All changes are audit logged
- ✅ Production features require special permissions
- ❌ Never expose internal feature names to frontend
- ❌ Don't use feature toggles for security controls

## 📊 Categories Available

1. **UI Features** - `feature_toggles:ui`
2. **API Features** - `feature_toggles:api`  
3. **Mobile Features** - `feature_toggles:mobile`
4. **Security Features** - `feature_toggles:security`
5. **Analytics** - `feature_toggles:analytics`
6. **Experimental** - `feature_toggles:experimental`
7. **System Features** - `feature_toggles:system`

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on API | Check route registration, restart server |
| Directive not working | Import FeatureToggleModule |
| Cache not updating | Check hot reload configuration |
| Permission denied | Verify user has config:write permission |

## 💡 Best Practices

- ✅ Use descriptive names: `user_dashboard_v2` not `feature1`
- ✅ Start disabled in production, enable gradually
- ✅ Clean up unused feature toggles regularly
- ✅ Test both enabled and disabled states
- ✅ Use categories to organize features
- ❌ Don't create too many nested conditions
- ❌ Don't use for permanent configuration