import { Pipe, PipeTransform } from '@angular/core';
import { Maybe } from '@dereekb/util';
import { DateRange, formatToTimeRangeString } from '@dereekb/date';

@Pipe({ name: 'dateTimeRange' })
export class DateTimeRangePipe implements PipeTransform {
  transform(input: Maybe<DateRange>, unavailable: string = 'Not Available'): string {
    if (input) {
      return formatToTimeRangeString(input);
    } else {
      return unavailable;
    }
  }
}
