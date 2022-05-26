import { AppLayoutComponent } from './container/layout.component';
import { NgModule } from '@angular/core';
import { UIRouterModule } from '@uirouter/angular';
import { DemoRootSharedModule } from '@dereekb/demo-components';
import { STATES } from './app.router';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [
    CommonModule,
    DemoRootSharedModule,
    UIRouterModule.forChild({
      states: STATES
    })
  ],
  declarations: [AppLayoutComponent]
})
export class RootAppModule {}
