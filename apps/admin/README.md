# AegisX Admin Application

A modern Angular 20 admin dashboard application built with standalone components for the AegisX Boilerplate healthcare information system.

## Overview

The Admin application provides a comprehensive administrative interface for managing users, monitoring system health, and accessing enterprise features of the AegisX platform.

## Features

- **Modern Dashboard**: Real-time metrics and system overview with beautiful card design
- **Responsive Design**: Mobile-first design with CSS Grid layout
- **Standalone Components**: Angular 20 standalone architecture
- **Custom Styling**: Modern, clean design with hover effects and smooth transitions
- **Emoji Icons**: Beautiful emoji-based icon system for better visual appeal
- **Type-Safe API Integration**: Uses shared types from `@aegisx-boilerplate/types`
- **Proxy Configuration**: Seamless API integration with backend services
- **Healthcare Compliance**: Ready for HIPAA-compliant features
- **PrimeNG Ready**: Architecture ready for PrimeNG integration when needed

## Technology Stack

- **Framework**: Angular 20 with standalone components
- **Styling**: Custom SCSS with modern design system
- **Icons**: Emoji-based icon system with fallbacks
- **Layout**: CSS Grid with responsive breakpoints
- **Development**: Nx workspace integration
- **Port**: 4201 (separate from main web app)

## Development

### Start Development Server
```bash
npm run start:admin
```
Access at: http://localhost:4201

### Build for Production
```bash
npm run build:admin
```

### Run Tests
```bash
npm run test:admin
```

### Lint Code
```bash
npm run lint:admin
```

### Start All Apps (API + Web + Admin)
```bash
npm run start:all
```

## Application Structure

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── pages/
│   │   │   └── dashboard/           # Admin dashboard component
│   │   ├── app.config.ts           # App configuration
│   │   ├── app.routes.ts           # Route definitions  
│   │   ├── app.ts                  # Root component
│   │   └── app.html                # Root template
│   ├── styles.scss                 # Global styles with grid system
│   └── main.ts                     # Bootstrap file
├── proxy.conf.json                 # API proxy configuration
├── project.json                    # Nx project configuration
└── README.md                       # This file
```

## Dashboard Features

### Metrics Cards
- **Total Users**: User count with trend indicators
- **Active Sessions**: Current system sessions
- **Notifications**: Notification counts and trends
- **API Calls**: API usage metrics with hourly trends

### Quick Actions
- Add New User
- System Settings
- Export Reports

### Recent Activity
- Activity feed (ready for implementation)

## Configuration

### Proxy Settings
The admin app is configured to proxy API calls to the backend:

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

### Port Configuration
- **Admin App**: http://localhost:4201
- **Web App**: http://localhost:4200  
- **API Server**: http://localhost:3000

## Shared Libraries

The admin app has access to shared libraries:

- `@aegisx-boilerplate/types` - Type-safe interfaces
- `@aegisx-boilerplate/api-client` - API client for backend integration

## Styling System

### Grid System
Custom responsive grid implementation:
```html
<div class="grid">
  <div class="col-12 md:col-6 lg:col-3">
    <!-- Content -->
  </div>
</div>
```

### Breakpoints
- **Mobile**: Default (all screens)
- **Tablet**: md: (768px+)
- **Desktop**: lg: (1024px+)

### Icon System
Custom emoji-based icons with PrimeIcons naming:
- `pi-users` → 👥
- `pi-bell` → 🔔
- `pi-chart-line` → 📈
- `pi-cog` → ⚙️

## Integration with AegisX Infrastructure

### Authentication
Ready for integration with:
- JWT authentication
- API key authentication
- RBAC (Role-Based Access Control)

### Backend APIs
Configured for seamless integration with:
- User Management APIs
- Notification System APIs
- Storage APIs
- Report Builder APIs
- Audit System APIs

### Healthcare Features
Ready for healthcare-specific features:
- Patient Management
- Appointment Scheduling
- Medical Records
- HIPAA Compliance

## Development Guidelines

### Adding New Components
```bash
# Generate new component
npx nx g @nx/angular:component pages/new-page --project=admin --standalone

# Add route to app.routes.ts
{
  path: 'new-page',
  loadComponent: () => import('./pages/new-page/new-page.component').then(m => m.NewPageComponent)
}
```

### API Integration Example
```typescript
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';

export class SomeService {
  private http = inject(HttpClient);

  // API calls automatically proxy to http://localhost:3000
  getUsers() {
    return this.http.get('/api/v1/users');
  }
}
```

## Testing

The admin app includes comprehensive testing:

- **Unit Tests**: Jest-based testing for components
- **Integration Tests**: Testing component interactions
- **E2E Tests**: Available through Nx workspace

### Test Coverage
- App component: ✅ Tested
- Dashboard component: ✅ Tested
- Build process: ✅ Verified
- Linting: ✅ Passing

## Production Deployment

### Build Optimization
- Tree shaking enabled
- Bundle size limits configured
- Source maps for debugging

### Bundle Analysis
```bash
npx nx build admin --stats-json
npx webpack-bundle-analyzer dist/apps/admin/browser/stats.json
```

## Next Steps

### Immediate Development
1. Implement real API integration
2. Add authentication middleware
3. Create user management interface
4. Implement notification center

### Enterprise Features
1. Role-based navigation
2. Advanced reporting dashboard
3. System monitoring interface
4. Healthcare-specific modules

### Performance Optimization
1. Implement lazy loading for routes
2. Add service workers for caching
3. Optimize bundle sizes
4. Add performance monitoring

## PrimeNG Integration (Optional)

The admin app is architected to support PrimeNG integration when needed. PrimeNG packages are already installed in the workspace.

### To Enable PrimeNG:

1. **Add PrimeNG styles to project.json:**
```json
"styles": [
  "node_modules/primeng/resources/themes/lara-light-blue/theme.css",
  "node_modules/primeng/resources/primeng.css", 
  "node_modules/primeicons/primeicons.css",
  "node_modules/primeflex/primeflex.css",
  "apps/admin/src/styles.scss"
]
```

2. **Enable animations in app.config.ts:**
```typescript
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    provideAnimations(),
  ],
};
```

3. **Import PrimeNG components in your component:**
```typescript
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  imports: [CardModule, ButtonModule],
  // ...
})
```

### Current Implementation

The dashboard currently uses:
- **Custom CSS Grid**: Responsive layout system
- **Emoji Icons**: Modern visual indicators  
- **Custom Cards**: Beautiful card design with hover effects
- **Clean Typography**: Professional healthcare-focused design

### Design System

- **Colors**: Healthcare-friendly blue and gray palette
- **Typography**: Clean, readable fonts optimized for admin interfaces
- **Spacing**: Consistent 8px grid system
- **Animations**: Subtle hover effects and transitions
- **Responsive**: Mobile-first approach with CSS Grid

## Contributing

When adding new features:

1. Follow Angular standalone component patterns
2. Use the existing styling system (or integrate PrimeNG as needed)
3. Integrate with shared types and API client
4. Write comprehensive tests
5. Update this README

---

**Access Points:**
- **Admin Dashboard**: http://localhost:4201 🏥
- **API Documentation**: http://localhost:3000/docs 📚
- **Main Web App**: http://localhost:4200 🌐

**Design Preview:**
- Modern card-based dashboard with metrics
- Emoji icons for better visual appeal
- Responsive grid layout
- Healthcare-focused color scheme
- Ready for PrimeNG enhancement when needed

For more information about the AegisX Boilerplate system, see the main project documentation.