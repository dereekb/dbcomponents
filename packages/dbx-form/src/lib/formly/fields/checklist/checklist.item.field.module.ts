import { MatRippleModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DbNgxDefaultChecklistItemFieldDisplayComponent } from './checklist.item.field.content.default.component';
import { MatButtonModule } from '@angular/material/button';
import { DbNgxAnchorModule, DbNgxTextModule } from '@dereekb/dbx-web';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormlyModule } from '@ngx-formly/core';
import { DbNgxFormWrapperModule } from '../wrappers/form.wrapper.module';
import { DbNgxChecklistItemContentComponent, DbNgxChecklistItemFieldComponent } from './checklist.item.field.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    DbNgxTextModule,
    FormsModule,
    ReactiveFormsModule,
    MatRippleModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    DbNgxAnchorModule,
    DbNgxFormWrapperModule,
    FormlyModule.forChild({
      types: [
        { name: 'checklistitem', component: DbNgxChecklistItemFieldComponent }
      ]
    })
  ],
  declarations: [
    DbNgxChecklistItemFieldComponent,
    DbNgxChecklistItemContentComponent,
    DbNgxDefaultChecklistItemFieldDisplayComponent
  ],
  exports: [
    DbNgxFormWrapperModule
  ]
})
export class DbNgxFormChecklistItemFieldModule { }
