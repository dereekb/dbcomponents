import { NgModule } from '@angular/core';
import { UIRouterModule } from '@uirouter/angular';
import { DocFormHomeComponent } from './container/home.component';
import { DocSharedModule } from '../shared/doc.shared.module';
import { DocFormWrapperComponent } from './container/wrapper.component';
import { DocFormTextEditorComponent } from './container/texteditor.component';
import { DocFormSelectionComponent } from './container/selection.component';
import { DocFormComponentComponent } from './container/component.component';
import { DocFormChecklistComponent } from './container/checklist.component';
import { DocFormLayoutComponent } from './container/layout.component';
import { STATES } from './doc.form.router';
import { DocFormValueComponent } from './container/value.component';

@NgModule({
  imports: [
    DocSharedModule,
    UIRouterModule.forChild({
      states: STATES
    })
  ],
  declarations: [
    DocFormLayoutComponent,
    DocFormHomeComponent,
    DocFormChecklistComponent,
    DocFormValueComponent,
    DocFormSelectionComponent,
    DocFormComponentComponent,
    DocFormTextEditorComponent,
    DocFormWrapperComponent
  ],
})
export class DocFormModule { }
