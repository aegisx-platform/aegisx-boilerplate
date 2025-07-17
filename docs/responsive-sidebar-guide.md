# Responsive Sidebar Implementation

## Overview
AegisX Admin dashboard now includes a fully responsive sidebar that adapts to different screen sizes and provides an optimal user experience across all devices.

## Features

### ✅ Responsive Design
- **Mobile (< 768px)**: Sidebar slides in from left with overlay
- **Tablet (768px - 1024px)**: Sidebar behaves like mobile with better spacing
- **Desktop (≥ 1024px)**: Traditional sidebar with collapse functionality

### ✅ Interactive Elements
- **Desktop**: Toggle button to collapse/expand sidebar
- **Mobile/Tablet**: Hamburger menu button and overlay for navigation
- **Auto-close**: Mobile menu closes automatically when navigating

### ✅ Accessibility
- Proper ARIA labels and roles
- Keyboard navigation support (Tab, Enter, Escape)
- Screen reader friendly
- Focus management

## Components

### 1. SidebarComponent
**Location**: `apps/admin/src/app/layout/components/sidebar/sidebar.component.ts`

**Key Properties**:
- `isCollapsed`: Controls sidebar collapse state on desktop
- `isMobileMenuOpen`: Controls mobile menu visibility
- `isMobile`: Tracks current screen size category

**Key Methods**:
- `toggleSidebar()`: Handles sidebar toggle for different screen sizes
- `closeMobileMenu()`: Closes mobile menu
- `onMenuItemClick()`: Closes mobile menu when item is clicked
- `getSidebarClasses()`: Returns dynamic CSS classes based on state

### 2. MobileMenuButtonComponent
**Location**: `apps/admin/src/app/layout/components/mobile-menu-button/mobile-menu-button.component.ts`

**Purpose**: Provides hamburger menu button for mobile/tablet devices
**Features**: 
- Only visible on screens < 1024px
- Emits events to parent component
- Proper accessibility attributes

### 3. LayoutComponent
**Location**: `apps/admin/src/app/layout/layout.component.ts`

**Purpose**: Main layout wrapper that coordinates sidebar and content
**Features**:
- Responsive header with mobile menu integration
- Content area with proper margins based on sidebar state
- Action buttons (notifications, search, profile)

### 4. ResponsiveService
**Location**: `apps/admin/src/app/shared/services/responsive.service.ts`

**Purpose**: Centralized responsive state management
**Features**:
- Observable-based reactive state
- Debounced resize event handling
- Breakpoint detection (mobile: 768px, tablet: 1024px)
- SSR-safe implementation

## Usage

### Basic Implementation
```typescript
// In your component
import { ResponsiveService } from '../shared/services/responsive.service';

export class MyComponent {
  private responsiveService = inject(ResponsiveService);
  
  ngOnInit() {
    this.responsiveService.getResponsiveState().subscribe(state => {
      console.log('Current state:', state);
      // { isMobile: false, isTablet: false, isDesktop: true, width: 1200 }
    });
  }
}
```

### Responsive Utilities
```typescript
// Check specific breakpoints
this.responsiveService.isMobile().subscribe(isMobile => {
  // Handle mobile-specific logic
});

this.responsiveService.isDesktop().subscribe(isDesktop => {
  // Handle desktop-specific logic
});

// Get current state synchronously
const currentState = this.responsiveService.getCurrentState();
```

## CSS Classes

### Main Classes
- `.sidebar-responsive`: Main sidebar container with responsive behavior
- `.mobile-overlay`: Semi-transparent overlay for mobile menu
- `.mobile-menu-btn`: Hamburger menu button styling
- `.main-content`: Content area with responsive margins

### State Classes
- `.open`: Applied when mobile menu is open
- `.collapsed`: Applied when desktop sidebar is collapsed
- `.expanded`: Applied when desktop sidebar is expanded

## Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 768px | Slide-in sidebar with overlay |
| Tablet | 768px - 1024px | Mobile-like behavior with better spacing |
| Desktop | ≥ 1024px | Traditional sidebar with collapse |

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations
- Resize events are debounced (250ms) to prevent excessive calculations
- Responsive state changes are optimized with `distinctUntilChanged`
- CSS transitions use GPU acceleration (`transform`, `opacity`)
- Menu items use semantic HTML elements for better performance

## Accessibility Features
- **ARIA Labels**: All interactive elements have proper labels
- **Keyboard Navigation**: Full keyboard support with Tab/Enter/Escape
- **Focus Management**: Proper focus trapping in mobile menu
- **Screen Reader**: Semantic HTML and ARIA roles
- **High Contrast**: Works with system high contrast modes

## Customization

### Breakpoint Modification
```typescript
// In responsive.service.ts
private readonly MOBILE_BREAKPOINT = 768;    // Modify as needed
private readonly TABLET_BREAKPOINT = 1024;   // Modify as needed
```

### Animation Timing
```css
/* In layout.responsive.css */
.sidebar-responsive {
  transition: transform 0.3s ease-in-out; /* Modify duration/easing */
}
```

### Width Customization
```css
.sidebar-responsive {
  width: 16rem; /* Default: w-64, modify as needed */
}

.sidebar-responsive.collapsed {
  width: 4rem; /* Default: w-16, modify as needed */
}
```

## Testing
- Tested on various screen sizes (320px - 2560px)
- Verified keyboard navigation functionality
- Screen reader compatibility tested
- Performance tested with rapid resize events

## Future Enhancements
- [ ] Swipe gestures for mobile menu
- [ ] Persistent sidebar state in localStorage
- [ ] Dark mode support
- [ ] RTL language support
- [ ] Animation preferences (reduce motion)
