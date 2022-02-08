import { NgModule } from '@angular/core';
import { DbxSectionLayoutModule } from './section/section.layout.module';
import { DbxListLayoutModule } from './list/list.layout.module';
import { DbxItemLayoutModule } from './item/item.layout.module';
import { DbxFlagLayoutModule } from './flag/flag.layout.module';
import { DbxContentLayoutModule } from './content/content.layout.module';
import { DbxColumnLayoutModule } from './column/column.layout.module';
import { DbxCardBoxLayoutModule } from './card/card.box.layout.module';
import { DbxBlockLayoutModule } from './block/block.layout.module';
import { DbxCompactLayoutModule } from './compact/compact.layout.module';
import { DbxStepLayoutModule } from './step/step.layout.module';
import { DbxBarLayoutModule } from './bar/bar.layout.module';
import { DbxTextModule } from './text/text.module';
import { DbxStyleLayoutModule } from './style/styles.layout.module';

@NgModule({
  exports: [
    DbxBarLayoutModule,
    DbxBlockLayoutModule,
    DbxCardBoxLayoutModule,
    DbxColumnLayoutModule,
    DbxCompactLayoutModule,
    DbxContentLayoutModule,
    DbxFlagLayoutModule,
    DbxItemLayoutModule,
    DbxListLayoutModule,
    DbxSectionLayoutModule,
    DbxStepLayoutModule,
    DbxStyleLayoutModule,
    DbxTextModule
  ],
})
export class DbxLayoutModule { }
