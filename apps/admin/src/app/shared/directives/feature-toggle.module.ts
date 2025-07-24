import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatureToggleDirective } from './feature-toggle.directive';

@NgModule({
  declarations: [FeatureToggleDirective],
  imports: [CommonModule],
  exports: [FeatureToggleDirective]
})
export class FeatureToggleModule { }