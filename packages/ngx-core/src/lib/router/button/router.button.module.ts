import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { UIRouterModule } from '@uirouter/angular';
import { MatProgressButtonsModule } from 'mat-progress-buttons';
import { DbNgxButtonComponent } from './button.component';
import { AppButtonSegueDirective } from '../router/button/button.segue.directive';
import { DbNgxLoadingButtonDirective } from './button.loading.directive';
import { DbNgxButtonSpacerComponent } from './button.spacer.component';

@NgModule({
  imports: [
    CommonModule,
    UIRouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressButtonsModule
  ],
  declarations: [
    AppButtonSegueDirective,
  ],
  exports: [
    AppButtonSegueDirective
  ],
})
export class DbNgxButtonModule {}
