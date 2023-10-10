import { addDays } from 'date-fns';
import { MapFunction, Maybe } from '@dereekb/util';
import { DateBlockIndex, DateBlockTiming, getCurrentDateBlockTimingStartDate } from './date.block';
import { YearWeekCode, YearWeekCodeDateReader, YearWeekCodeFactory, yearWeekCodeFromDate, yearWeekCodeGroupFactory, YearWeekCodeGroupFactory, YearWeekCodeReader } from './date.week';

/**
 * Used to return the proper YearWeekCode for the input DateBlockIndex relative to the configured timing, or a Date.
 *
 * @deprecated use DateCell implementation instead.
 */
export type DateBlockIndexYearWeekCodeFactory = (indexOrDate: DateBlockIndex | Date) => YearWeekCode;

/**
 *
 * @deprecated use DateCell implementation instead.
 */
export interface DateBlockIndexYearWeekCodeConfig {
  readonly timing: DateBlockTiming;
}

/**
 *
 * @deprecated use DateCell implementation instead.
 * @param config
 * @returns
 */
export function dateBlockIndexYearWeekCodeFactory(config: DateBlockIndexYearWeekCodeConfig): DateBlockIndexYearWeekCodeFactory {
  const { timing } = config;
  const startDate = getCurrentDateBlockTimingStartDate(timing); // midnight of day 0

  return (indexOrDate: DateBlockIndex | Date) => {
    let inputDate: Date;

    if (typeof indexOrDate === 'number') {
      inputDate = addDays(startDate, indexOrDate);
    } else {
      inputDate = indexOrDate;
    }

    const yearWeekCode = yearWeekCodeFromDate(inputDate);
    return yearWeekCode;
  };
}

/**
 * MapFunction that reads the relevant date to use for the YearWeekCode calculation from the input item.
 *
 * @deprecated use DateCell implementation instead.
 */
export type DateBlockIndexYearWeekCodeReader<B> = MapFunction<B, Maybe<DateBlockIndex | Date>>;

/**
 *
 * @deprecated use DateCell implementation instead.
 */
export interface DateBlockIndexYearWeekCodeGroupFactoryConfig<B> {
  readonly dateBlockIndexReader: DateBlockIndexYearWeekCodeReader<B>;
  readonly dateBlockIndexYearWeekCodeFactory: DateBlockIndexYearWeekCodeFactory | DateBlockIndexYearWeekCodeConfig;
}

/**
 *
 * @deprecated use DateCell implementation instead.
 * @param config
 * @returns
 */
export function dateBlockIndexYearWeekCodeGroupFactory<B>(config: DateBlockIndexYearWeekCodeGroupFactoryConfig<B>): YearWeekCodeGroupFactory<B> {
  const { dateBlockIndexReader, dateBlockIndexYearWeekCodeFactory: inputDateBlockIndexYearWeekCodeFactory } = config;
  const dateBlockIndexYearWeekCode = typeof inputDateBlockIndexYearWeekCodeFactory === 'function' ? inputDateBlockIndexYearWeekCodeFactory : dateBlockIndexYearWeekCodeFactory(inputDateBlockIndexYearWeekCodeFactory);

  const factory = yearWeekCodeGroupFactory<B>({
    yearWeekCodeFactory: dateBlockIndexYearWeekCode as YearWeekCodeFactory,
    yearWeekCodeReader: dateBlockIndexYearWeekCode as YearWeekCodeReader,
    dateReader: dateBlockIndexReader as YearWeekCodeDateReader<B>
  });

  return factory;
}
