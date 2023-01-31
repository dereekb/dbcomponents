import { ChangeDetectionStrategy, Component } from '@angular/core';
import { map, distinctUntilChanged } from 'rxjs';
import { DbxTableStore } from './table.store';

@Component({
  selector: 'dbx-table-summary-end-cell',
  template: `
    <dbx-injection [config]="config$ | async"></dbx-injection>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DbxTableSummaryEndCellComponent {
  readonly config$ = this.tableStore.viewDelegate$.pipe(
    map((x) => x.summaryRowEnd),
    distinctUntilChanged()
  );

  constructor(readonly tableStore: DbxTableStore) {}
}
