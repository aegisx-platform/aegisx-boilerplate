import { 
  Directive, 
  Input, 
  TemplateRef, 
  ViewContainerRef, 
  OnInit, 
  OnDestroy, 
  inject 
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FeatureToggleService } from '../../features/configuration/services/feature-toggle.service';

/**
 * Feature Toggle Directive
 * 
 * ใช้สำหรับแสดง/ซ่อน element ตาม feature flag
 * 
 * Usage:
 * <div *featureToggle="'new_dashboard'">
 *   This content is only shown when new_dashboard feature is enabled
 * </div>
 * 
 * <div *featureToggle="'advanced_search'; environment: 'production'">
 *   This content is only shown when advanced_search is enabled in production
 * </div>
 * 
 * <div *featureToggle="'beta_features'; else: elseTemplate">
 *   Beta features content
 * </div>
 * <ng-template #elseTemplate>
 *   Standard features content
 * </ng-template>
 */
@Directive({
  selector: '[featureToggle]',
  standalone: true
})
export class FeatureToggleDirective implements OnInit, OnDestroy {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private featureToggleService = inject(FeatureToggleService);
  
  private destroy$ = new Subject<void>();
  private hasView = false;
  private featureName = '';
  private environment = 'development';
  private elseTemplate: TemplateRef<any> | null = null;

  @Input() 
  set featureToggle(featureName: string) {
    this.featureName = featureName;
    this.updateView();
  }

  @Input()
  set featureToggleEnvironment(environment: string) {
    this.environment = environment || 'development';
    this.updateView();
  }

  @Input()
  set featureToggleElse(templateRef: TemplateRef<any> | null) {
    this.elseTemplate = templateRef;
    this.updateView();
  }

  ngOnInit() {
    // Subscribe to feature flag changes
    this.featureToggleService.featureFlags$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });

    // Initial load
    this.updateView();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView() {
    if (!this.featureName) return;

    const isEnabled = this.featureToggleService.isFeatureEnabledSync(this.featureName);
    
    if (isEnabled && !this.hasView) {
      // Show main template
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!isEnabled && this.hasView) {
      // Hide main template and show else template if available
      this.viewContainer.clear();
      this.hasView = false;
      
      if (this.elseTemplate) {
        this.viewContainer.createEmbeddedView(this.elseTemplate);
      }
    } else if (!isEnabled && !this.hasView && this.elseTemplate) {
      // Show else template
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.elseTemplate);
    }
  }
}

/**
 * Feature Toggle If Directive
 * 
 * ใช้สำหรับการตรวจสอบแบบ if-else ที่ซับซ้อนขึ้น
 * 
 * Usage:
 * <div *featureToggleIf="'new_dashboard'; then: newDashboard; else: oldDashboard">
 * </div>
 * 
 * <ng-template #newDashboard>
 *   <app-new-dashboard></app-new-dashboard>
 * </ng-template>
 * 
 * <ng-template #oldDashboard>
 *   <app-old-dashboard></app-old-dashboard>
 * </ng-template>
 */
@Directive({
  selector: '[featureToggleIf]',
  standalone: true
})
export class FeatureToggleIfDirective implements OnInit, OnDestroy {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private featureToggleService = inject(FeatureToggleService);
  
  private destroy$ = new Subject<void>();
  private featureName = '';
  private environment = 'development';
  private thenTemplate: TemplateRef<any> | null = null;
  private elseTemplate: TemplateRef<any> | null = null;

  @Input() 
  set featureToggleIf(featureName: string) {
    this.featureName = featureName;
    this.updateView();
  }

  @Input()
  set featureToggleIfEnvironment(environment: string) {
    this.environment = environment || 'development';
    this.updateView();
  }

  @Input()
  set featureToggleIfThen(templateRef: TemplateRef<any> | null) {
    this.thenTemplate = templateRef;
    this.updateView();
  }

  @Input()
  set featureToggleIfElse(templateRef: TemplateRef<any> | null) {
    this.elseTemplate = templateRef;
    this.updateView();
  }

  ngOnInit() {
    this.featureToggleService.featureFlags$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });

    this.updateView();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView() {
    if (!this.featureName) return;

    this.viewContainer.clear();
    
    const isEnabled = this.featureToggleService.isFeatureEnabledSync(this.featureName);
    
    if (isEnabled && this.thenTemplate) {
      this.viewContainer.createEmbeddedView(this.thenTemplate);
    } else if (!isEnabled && this.elseTemplate) {
      this.viewContainer.createEmbeddedView(this.elseTemplate);
    } else if (isEnabled && !this.thenTemplate) {
      // Use default template if no then template provided
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}

/**
 * Feature Toggle Multiple Directive
 * 
 * ใช้สำหรับตรวจสอบหลาย features พร้อมกัน
 * 
 * Usage:
 * <div *featureToggleMultiple="['feature1', 'feature2']; requireAll: true">
 *   This shows when both features are enabled
 * </div>
 * 
 * <div *featureToggleMultiple="['feature1', 'feature2']; requireAll: false">
 *   This shows when at least one feature is enabled
 * </div>
 */
@Directive({
  selector: '[featureToggleMultiple]',
  standalone: true
})
export class FeatureToggleMultipleDirective implements OnInit, OnDestroy {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private featureToggleService = inject(FeatureToggleService);
  
  private destroy$ = new Subject<void>();
  private hasView = false;
  private featureNames: string[] = [];
  private requireAll = true;

  @Input() 
  set featureToggleMultiple(featureNames: string[]) {
    this.featureNames = featureNames || [];
    this.updateView();
  }

  @Input()
  set featureToggleMultipleRequireAll(requireAll: boolean) {
    this.requireAll = requireAll;
    this.updateView();
  }

  ngOnInit() {
    this.featureToggleService.featureFlags$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });

    this.updateView();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView() {
    if (!this.featureNames.length) return;

    const featureStates = this.featureNames.map(name => 
      this.featureToggleService.isFeatureEnabledSync(name)
    );

    let shouldShow = false;
    
    if (this.requireAll) {
      // All features must be enabled
      shouldShow = featureStates.every(state => state);
    } else {
      // At least one feature must be enabled
      shouldShow = featureStates.some(state => state);
    }

    if (shouldShow && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!shouldShow && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

/**
 * Export all directives for easy importing
 */
export const FEATURE_TOGGLE_DIRECTIVES = [
  FeatureToggleDirective,
  FeatureToggleIfDirective,
  FeatureToggleMultipleDirective
] as const;