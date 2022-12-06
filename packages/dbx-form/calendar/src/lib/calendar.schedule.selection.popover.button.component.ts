import { DbxScheduleSelectionCalendarDatePopoverComponent } from './calendar.schedule.selection.popover.component';
import { Component, ElementRef, Injector, ViewChild } from '@angular/core';
import { DbxPopoverKey, AbstractPopoverDirective, DbxPopoverService } from '@dereekb/dbx-web';
import { NgPopoverRef } from 'ng-overlay-container';
import { of, map, shareReplay } from 'rxjs';
import { DbxCalendarScheduleSelectionStore } from './calendar.schedule.selection.store';
import { formatToDateString } from '@dereekb/date';

@Component({
  selector: 'dbx-schedule-selection-calendar-date-popover-button',
  template: `
    <dbx-button #buttonPopoverOrigin icon="date_range" [raised]="true" color="accent" [text]="buttonText$ | async" (buttonClick)="openPopover()"></dbx-button>
  `
})
export class DbxScheduleSelectionCalendarDatePopoverButtonComponent {
  @ViewChild('buttonPopoverOrigin', { read: ElementRef })
  buttonPopoverOrigin!: ElementRef;

  readonly buttonText$ = this.dbxCalendarScheduleSelectionStore.currentMinAndMaxDate$.pipe(
    map((x) => {
      console.log({ x });

      if (x?.start && x.end) {
        return `${formatToDateString(x.start)} - ${formatToDateString(x.end)}`;
      } else {
        return 'Pick a Date Range';
      }
    }),
    shareReplay(1)
  );

  constructor(readonly popoverService: DbxPopoverService, readonly dbxCalendarScheduleSelectionStore: DbxCalendarScheduleSelectionStore, readonly injector: Injector) {}

  openPopover() {
    DbxScheduleSelectionCalendarDatePopoverComponent.openPopover(this.popoverService, { origin: this.buttonPopoverOrigin, injector: this.injector });
  }
}
