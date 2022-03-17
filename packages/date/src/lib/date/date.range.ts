import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsDate, IsNumber } from "class-validator";
import { addDays, addHours, endOfDay, endOfMonth, endOfWeek, isPast, startOfDay, startOfMinute, startOfMonth, startOfWeek } from "date-fns";

/**
 * Represents a start and end date.
 */
export interface DateRange {
  start: Date;
  end: Date;
}

export enum DateRangeType {
  /**
   * Includes only the target day.
   */
  DAY = 'day',
  /**
   * Includes only the target week.
   */
  WEEK = 'week',
  /**
   * Includes only the target month.
   */
  MONTH = 'month',
  /**
   * Range specified in hours with the input.
   */
  HOURS_RANGE = 'hours_range',
  /**
   * Range specified in days with the input.
   */
  DAYS_RANGE = 'days_range',
  /**
   * Range specified in weeks with the input.
   */
  WEEKS_RANGE = 'weeks_range',
  /**
   * Radius specified in hours with the input.
   */
  HOURS_RADIUS = 'hours_radius',
  /**
   * Radius specified in days with the input.
   */
  DAYS_RADIUS = 'days_radius',
  /**
   * Radius specified in weeks with the input.
   */
  WEEKS_RADIUS = 'weeks_radius',
  /**
   * Plus/minus 20 hours from the current day.
   * 
   * @deprecated design not relevant anymore
   */
  WITHIN_DAY = 'within_day',
  /**
   * Plus/minus 4 days from the current day.
   * 
   * @deprecated design not relevant anymore
   */
  WITHIN_WEEK = 'within_week',
  /**
   * Plus/minus 16 days from the current day.
   * 
   * @deprecated design not relevant anymore
   */
  WITHIN_MONTH = 'within_month'
};

export enum DateRangeState {
  /**
   * Range has yet to start and is in the future.
   */
  FUTURE = 'future',
  /**
   * Range is in the present, but not yet ended.
   */
  PRESENT = 'present',
  /**
   * Range is in the past.
   */
  PAST = 'past'
}

/**
 * Params for building a date range.
 */
export class DateRangeParams {

  /**
   * Type of range.
   */
  @IsEnum(DateRangeType)
  type: DateRangeType = DateRangeType.DAY;

  /**
   * Date to filter on. If not provided, assumes now.
   */
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date: Date = new Date();

  @IsNumber()
  @IsOptional()
  distance?: number;

  constructor(template: DateRangeParams) {
    if (template) {
      this.type = template.type;
      this.date = template.date;
      this.distance = template.distance;
    }
  }

}

/**
 * Creates a DateRange from the input DateRangeParams
 * 
 * @param param0 
 * @param roundToMinute 
 * @returns 
 */
export function makeDateRange({ type, date = new Date(), distance }: DateRangeParams, roundToMinute = false): DateRange {
  let start: Date;
  let end: Date;

  if (roundToMinute) {
    date = startOfMinute(date); // Reset to start of minute
  }

  distance = distance ?? 1;

  const hasNegativeDistance = distance < 0;

  switch (type) {
    case DateRangeType.DAY:
      start = startOfDay(date);
      end = endOfDay(date);
      break;
    case DateRangeType.WEEK:
      start = startOfWeek(date);
      end = endOfWeek(date);
      break;
    case DateRangeType.MONTH:
      start = startOfMonth(date);
      end = endOfMonth(date);
      break;
    case DateRangeType.HOURS_RANGE:
      if (hasNegativeDistance) {
        start = addHours(date, distance);
        end = date;
      } else {
        start = date;
        end = addHours(date, distance);
      }
      break;
    case DateRangeType.DAYS_RANGE:
      if (hasNegativeDistance) {
        start = addDays(date, distance);
        end = date;
      } else {
        start = date;
        end = addDays(date, distance);
      }
      break;
    case DateRangeType.WEEKS_RANGE:
      if (hasNegativeDistance) {
        start = addDays(date, distance * 7);
        end = date;
      } else {
        start = date;
        end = addDays(date, distance * 7);
      }
      break;
    case DateRangeType.HOURS_RADIUS:
      distance = Math.abs(distance);
      start = addHours(date, -distance);
      end = addHours(date, distance);
      break;
    case DateRangeType.DAYS_RADIUS:
      distance = Math.abs(distance);
      start = addDays(date, -distance);
      end = addDays(date, distance);
      break;
    case DateRangeType.WEEKS_RADIUS:
      distance = Math.abs(distance);
      start = addDays(date, -distance * 7);
      end = addDays(date, distance * 7);
      break;
    case DateRangeType.WITHIN_DAY:
      start = addHours(date, -20);
      end = addHours(date, 20);
      break;
    case DateRangeType.WITHIN_WEEK:
      start = startOfDay(addDays(date, -4));
      end = endOfDay(addDays(date, 4));
      break;
    case DateRangeType.WITHIN_MONTH:
      start = startOfDay(addDays(date, -16));
      end = endOfDay(addDays(date, 16));
      break;
  }

  return {
    start, end
  };
}

/**
 * Returns the DateRangeState from the input DateRange.
 * 
 * @param param0 
 * @returns 
 */
export function dateRangeState({ start, end }: DateRange): DateRangeState {
  if (isPast(end)) {
    return DateRangeState.PAST;
  } else if (isPast(start)) {
    return DateRangeState.PRESENT;
  } else {
    return DateRangeState.FUTURE;
  }
}
