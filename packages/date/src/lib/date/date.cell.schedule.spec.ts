import { DateCell, DateCellIndex, dateCellTiming } from './date.cell';
import {
  expandDateCellScheduleFactory,
  DateCellSchedule,
  dateCellScheduleDateCellTimingFilter,
  DateCellScheduleDayCode,
  dateCellScheduleDayCodeFactory,
  dateCellScheduleEncodedWeek,
  dateCellScheduleDateFilter,
  DateCellScheduleDateFilterConfig,
  weekdayDateCellScheduleDayCodes,
  rawDateCellScheduleDayCodes,
  expandDateCellScheduleDayCodes,
  DateCellScheduleEncodedWeek,
  weekendDateCellScheduleDayCodes,
  expandDateCellScheduleDayCodesToDayOfWeekSet,
  expandDateCellScheduleRange,
  expandDateCellScheduleRangeToDateCellRanges,
  isSameDateCellSchedule,
  dateCellScheduleDayCodesAreSetsEquivalent,
  dateCellTimingForExpandDateCellScheduleRangeInput,
  DateCellScheduleRange,
  expandDateCellSchedule
} from './date.cell.schedule';
import { addDays, addHours, addMinutes, differenceInDays } from 'date-fns';
import { Day, range, UTC_TIMEZONE_STRING, lastValue, TimezoneString, MINUTES_IN_HOUR } from '@dereekb/util';
import { durationSpanToDateRange } from './date.duration';
import { systemNormalDateToBaseDate, startOfDayInTimezoneFromISO8601DayString, dateTimezoneUtcNormal } from './date.timezone';
import { dateCellIndexRange } from './date.cell.factory';

describe('dateCellScheduleDateFilter()', () => {
  const startsAt = systemNormalDateToBaseDate(new Date('2022-01-02T00:00:00Z')); // Sunday

  describe('function', () => {
    describe('included', () => {
      const dayIndexes = [0, 1, 2, 3];
      const schedule: DateCellScheduleDateFilterConfig = { startsAt, w: '0', d: dayIndexes };
      const firstFourDays = dateCellScheduleDateFilter(schedule);

      it('should allow the included days (indexes)', () => {
        const maxIndex = 5;
        const dateCells: DateCellIndex[] = range(0, maxIndex);
        const results = dateCells.filter(firstFourDays);

        expect(results.length).toBe(dayIndexes.length);
      });
    });

    describe('schedule', () => {
      describe('weekdays and weekends', () => {
        const schedule: DateCellScheduleDateFilterConfig = { startsAt, w: '89' };
        const weekDaysAndWeekends = dateCellScheduleDateFilter(schedule);

        it('should allow every day of the week (dates)', () => {
          const maxIndex = 14;
          const dateCells: Date[] = range(0, maxIndex).map((y) => addDays(startsAt, y));

          const results = dateCells.filter(weekDaysAndWeekends);
          expect(results.length).toBe(maxIndex);
        });

        describe('with exclusion', () => {
          const ex = [0, 1, 2];
          const scheduleWithExclusion: DateCellScheduleDateFilterConfig = { startsAt, ex, w: '89' };
          const weekDaysAndWeekendsWithExclusion = dateCellScheduleDateFilter(scheduleWithExclusion);

          it('should exclude the configured indexes.', () => {
            const maxIndex = 14;
            const dateCells: DateCellIndex[] = range(0, maxIndex);
            const results = dateCells.filter(weekDaysAndWeekendsWithExclusion);

            expect(results.length).toBe(maxIndex - ex.length);
          });
        });
      });

      describe('weekdays', () => {
        const schedule: DateCellScheduleDateFilterConfig = { startsAt, w: `${DateCellScheduleDayCode.WEEKDAY}` };
        const weekDays = dateCellScheduleDateFilter(schedule);

        it('should allow every weekday (indexes)', () => {
          const maxIndex = 14;
          const dateCells: DateCellIndex[] = range(0, maxIndex);
          const results = dateCells.filter(weekDays);

          expect(results.length).toBe(maxIndex - 4);
        });

        it('should allow every weekday (dates)', () => {
          const maxIndex = 14;
          const dateCells: Date[] = range(0, maxIndex).map((y) => addDays(startsAt, y));
          const results = dateCells.filter(weekDays);

          expect(results.length).toBe(maxIndex - 4);
        });
      });

      describe('weekends', () => {
        const schedule: DateCellScheduleDateFilterConfig = { startsAt, w: `${DateCellScheduleDayCode.WEEKEND}` };
        const weekends = dateCellScheduleDateFilter(schedule);

        it('should allow every weekend (indexes)', () => {
          const maxIndex = 14;
          const dateCells: DateCellIndex[] = range(0, maxIndex);
          const results = dateCells.filter(weekends);
          expect(results.length).toBe(maxIndex - 10);
        });

        it('should allow every weekend (dates)', () => {
          const maxIndex = 14;
          const dateCells: Date[] = range(0, maxIndex).map((y) => addDays(startsAt, y));
          const results = dateCells.filter(weekends);
          expect(results.length).toBe(maxIndex - 10);
        });
      });

      describe('days', () => {
        const schedule: DateCellScheduleDateFilterConfig = { startsAt, w: `23` };
        const mondayAndTuesdays = dateCellScheduleDateFilter(schedule);

        it('should only allow the specified days of the week (indexes)', () => {
          const maxIndex = 14;
          const dateCells: DateCellIndex[] = range(0, maxIndex);
          const results = dateCells.filter(mondayAndTuesdays);

          expect(results.length).toBe(4);

          // week 1
          expect(results[0]).toBe(1);
          expect(results[1]).toBe(2);

          // week 2
          expect(results[2]).toBe(8);
          expect(results[3]).toBe(9);
        });

        it('should only allow the specified days of the week (dates)', () => {
          const maxIndex = 14;
          const dateCells: Date[] = range(0, maxIndex).map((y) => addDays(startsAt, y));
          const results = dateCells.filter(mondayAndTuesdays);

          expect(results.length).toBe(4);

          // week 1
          expect(results[0]).toBeSameSecondAs(addDays(startsAt, 1));
          expect(results[1]).toBeSameSecondAs(addDays(startsAt, 2));

          // week 2
          expect(results[2]).toBeSameSecondAs(addDays(startsAt, 8));
          expect(results[3]).toBeSameSecondAs(addDays(startsAt, 9));
        });
      });

      describe('scenario', () => {
        it('should filter April 26th, 2023 as included within the filter for that date.', () => {
          const w = '8';
          const d: number[] = [];
          const ex: number[] = [];

          const startsAt = new Date('Wed, 26 Apr 2023 05:00:00 GMT');
          const end = new Date('Wed, 26 Apr 2023 22:00:00 GMT');

          const filter = dateCellScheduleDateFilter({
            w,
            d,
            ex,
            startsAt,
            end
          });

          const indexZero = 0;

          const result = filter(indexZero);
          expect(result).toBe(true);
        });
      });

      // TODO: Test min/max date range
    });
  });
});

describe('dateCellScheduleDateCellTimingFilter()', () => {
  const totalDays = 14;

  const startsAt = systemNormalDateToBaseDate(new Date('2022-01-02T00:00:00Z')); // Sunday
  const weekTiming = dateCellTiming({ startsAt, duration: 60 }, totalDays); // Sunday-Saturday

  describe('function', () => {
    describe('schedule', () => {
      describe('weekdays and weekends', () => {
        const schedule: DateCellSchedule = { w: '89' };
        const weekDaysAndWeekends = dateCellScheduleDateCellTimingFilter({ timing: weekTiming, schedule });

        it('should allow every day of the week', () => {
          const maxIndex = totalDays + 1;
          const dateCells: DateCell[] = range(0, maxIndex).map((i) => ({ i }));
          const results = dateCells.filter(weekDaysAndWeekends);

          expect(results.length).toBe(totalDays);
        });
      });

      describe('weekdays', () => {
        const schedule: DateCellSchedule = { w: `${DateCellScheduleDayCode.WEEKDAY}` };
        const weekDays = dateCellScheduleDateCellTimingFilter({ timing: weekTiming, schedule });

        it('should allow every weekday', () => {
          const maxIndex = totalDays + 1;
          const dateCells: DateCell[] = range(0, maxIndex).map((i) => ({ i }));
          const results = dateCells.filter(weekDays);

          expect(results.length).toBe(totalDays - 4);
        });
      });

      describe('weekends', () => {
        const schedule: DateCellSchedule = { w: `${DateCellScheduleDayCode.WEEKEND}` };
        const weekends = dateCellScheduleDateCellTimingFilter({ timing: weekTiming, schedule });

        it('should allow every weekend', () => {
          const maxIndex = totalDays + 1;
          const dateCells: DateCell[] = range(0, maxIndex).map((i) => ({ i }));
          const results = dateCells.filter(weekends);
          expect(results.length).toBe(totalDays - 10);
        });
      });

      describe('days', () => {
        const schedule: DateCellSchedule = { w: `23` };
        const mondayAndTuesdays = dateCellScheduleDateCellTimingFilter({ timing: weekTiming, schedule });

        it('should only allow the specified days of the week', () => {
          const maxIndex = totalDays + 1;
          const dateCells: DateCell[] = range(0, maxIndex).map((i) => ({ i }));
          const results = dateCells.filter(mondayAndTuesdays);

          expect(results.length).toBe(4);

          // week 1
          expect(results[0].i).toBe(1);
          expect(results[1].i).toBe(2);

          // week 2
          expect(results[2].i).toBe(8);
          expect(results[3].i).toBe(9);
        });
      });
    });
  });
});

describe('expandDateCellScheduleFactory()', () => {
  const startsAt = systemNormalDateToBaseDate(new Date('2022-01-02T00:00:00Z')); // Sunday - Offset to reverse
  const weekTiming = dateCellTiming({ startsAt, duration: 60 }, 7); // Sunday-Saturday

  describe('function', () => {
    describe('schedule', () => {
      describe('weekdays and weekends', () => {
        const schedule: DateCellSchedule = { w: '89' };
        const weekDaysAndWeekends = expandDateCellScheduleFactory({ timing: weekTiming, schedule });

        it('should allow every day of the week', () => {
          const dateCellForRange = {
            i: 0,
            to: 6
          };

          const results = weekDaysAndWeekends([dateCellForRange]);
          expect(results.length).toBe(dateCellForRange.to + 1);

          expect(results[0].startsAt).toBeSameSecondAs(startsAt);
          expect(results[0].duration).toBe(weekTiming.duration);
          expect(results[0].i).toBe(0);

          expect(results[1].startsAt).toBeSameSecondAs(addDays(startsAt, 1));
        });

        describe('with exclusion in schedule', () => {
          const ex = [0, 1, 2];
          const scheduleWithExclusion: DateCellSchedule = { ...schedule, ex }; // Sunday/Monday/Tuesday out
          const weekDaysAndWeekendsWithExclusion = expandDateCellScheduleFactory({ timing: weekTiming, schedule: scheduleWithExclusion });

          it('should exclude the specified days in the schedule', () => {
            const dateCellForRange = {
              i: 0,
              to: 6
            };

            const results = weekDaysAndWeekendsWithExclusion([dateCellForRange]);
            expect(results.length).toBe(dateCellForRange.to + 1 - ex.length);

            expect(results[0].i).toBe(3);
            expect(results[0].duration).toBe(weekTiming.duration);
            expect(results[0].startsAt).toBeSameSecondAs(addDays(startsAt, ex.length));
          });
        });
      });

      describe('weekdays', () => {
        const schedule: DateCellSchedule = { w: `${DateCellScheduleDayCode.WEEKDAY}` };
        const weekDays = expandDateCellScheduleFactory({ now: startsAt, timing: weekTiming, schedule });

        it('should allow every weekday', () => {
          const dateCellForRange = {
            i: 0,
            to: 6
          };

          const results = weekDays([dateCellForRange]);
          expect(results.length).toBe(5);
        });
      });

      describe('weekends', () => {
        const schedule: DateCellSchedule = { w: `${DateCellScheduleDayCode.WEEKEND}` };
        const weekends = expandDateCellScheduleFactory({ now: startsAt, timing: weekTiming, schedule });

        it('should allow every weekend day', () => {
          const dateCellForRange = {
            i: 0,
            to: 6
          };

          const results = weekends([dateCellForRange]);
          expect(results.length).toBe(2);
        });

        describe('onlyBlocksNotYetStarted=true', () => {
          const weekends = expandDateCellScheduleFactory({ now: startsAt, timing: weekTiming, schedule, onlyBlocksNotYetStarted: true });

          it('should return every future weekend day', () => {
            const dateCellForRange = {
              i: 0,
              to: 6
            };

            const results = weekends([dateCellForRange]);

            expect(results.length).toBe(1);
            expect(results[0].i).toBe(6);
          });
        });
      });

      describe('days', () => {
        const schedule: DateCellSchedule = { w: `12` };
        const mondayAndTuesdays = expandDateCellScheduleFactory({ now: startsAt, timing: weekTiming, schedule });

        it('should only allow the specified days of the week', () => {
          const dateCellForRange = {
            i: 0,
            to: 6
          };

          const results = mondayAndTuesdays([dateCellForRange]);
          expect(results.length).toBe(2);
        });
      });
    });

    describe('timezones', () => {
      function describeTestsForTimezone(timezone: TimezoneString) {
        const timezoneInstance = dateTimezoneUtcNormal({ timezone });
        const startOfTodayInTimezone = timezoneInstance.startOfDayInTargetTimezone();
        const timing = dateCellTiming({ startsAt: startOfTodayInTimezone, duration: 60 }, 1, timezone); // 1 day

        describe(`${timezone}`, () => {
          it(`should return the first startsAt of the timing for ${timezone}`, () => {
            const schedule: DateCellSchedule = { w: '89' };
            const expandedDays = expandDateCellSchedule({ timing, schedule, maxDateCellsToReturn: 1 });

            expect(timing.startsAt).toBeSameSecondAs(startOfTodayInTimezone);

            const expandedDayZero = expandedDays[0];
            expect(expandedDayZero.i).toBe(0);
            expect(expandedDayZero.startsAt).toBeSameSecondAs(timing.startsAt);
          });
        });
      }

      describeTestsForTimezone('UTC');
      describeTestsForTimezone('America/Denver');
      describeTestsForTimezone('America/Los_Angeles');
      describeTestsForTimezone('America/New_York');
      describeTestsForTimezone('America/Chicago');
      describeTestsForTimezone('Pacific/Fiji');
    });
  });
});

describe('expandDateCellScheduleDayCodesToDayOfWeekSet()', () => {
  it('should convert the input to DayOfWeek values', () => {
    const code = DateCellScheduleDayCode.SUNDAY;
    const result = expandDateCellScheduleDayCodesToDayOfWeekSet(code);

    expect(result).toContain(Day.SUNDAY);
  });

  it('should expand the weekend token into the individual weekend days', () => {
    const code = DateCellScheduleDayCode.WEEKEND;
    const result = expandDateCellScheduleDayCodesToDayOfWeekSet(code);

    expect(result).toContain(Day.SUNDAY);
    expect(result).toContain(Day.SATURDAY);
  });
});

describe('expandDateCellScheduleDayCodes()', () => {
  describe('days', () => {
    it('should filter none from the results.', () => {
      const code = DateCellScheduleDayCode.NONE;
      const result = expandDateCellScheduleDayCodes(code);
      expect(result.length).toBe(0);
    });

    it('should return an array from a single day code', () => {
      const code = DateCellScheduleDayCode.SUNDAY;
      const result = expandDateCellScheduleDayCodes(code);

      expect(result.length).toBe(1);
      expect(result[0]).toBe(code);
    });

    it('should expand the weekday token into the individual weekdays.', () => {
      const code = DateCellScheduleDayCode.WEEKDAY;
      const result = expandDateCellScheduleDayCodes(code);

      const expectedDays = weekdayDateCellScheduleDayCodes();
      expect(result.length).toBe(expectedDays.length);

      expectedDays.forEach((day) => {
        expect(result).toContain(day);
      });
    });

    it('should expand the weekend token into the individual weekends.', () => {
      const code = DateCellScheduleDayCode.WEEKEND;
      const result = expandDateCellScheduleDayCodes(code);

      const expectedDays = weekendDateCellScheduleDayCodes();
      expect(result.length).toBe(expectedDays.length);

      expectedDays.forEach((day) => {
        expect(result).toContain(day);
      });
    });
  });

  describe('days array', () => {
    it('should filter none from the results.', () => {
      const code = DateCellScheduleDayCode.NONE;
      const result = expandDateCellScheduleDayCodes([code]);
      expect(result.length).toBe(0);
    });

    it('should return an array containing the day', () => {
      const code = DateCellScheduleDayCode.SUNDAY;
      const result = expandDateCellScheduleDayCodes([code]);

      expect(result.length).toBe(1);
      expect(result[0]).toBe(code);
    });
  });

  describe('days set', () => {
    it('should filter none from the results.', () => {
      const code = DateCellScheduleDayCode.NONE;
      const result = expandDateCellScheduleDayCodes(new Set([code]));
      expect(result.length).toBe(0);
    });

    it('should return an array containing the day', () => {
      const code = DateCellScheduleDayCode.SUNDAY;
      const result = expandDateCellScheduleDayCodes(new Set([code]));

      expect(result.length).toBe(1);
      expect(result[0]).toBe(code);
    });
  });
});

describe('rawDateCellScheduleDayCodes()', () => {
  describe('days', () => {
    it('should filter none from the results.', () => {
      const code = DateCellScheduleDayCode.NONE;
      const result = rawDateCellScheduleDayCodes(code);
      expect(result.length).toBe(0);
    });

    it('should return an array from a single day code', () => {
      const code = DateCellScheduleDayCode.SUNDAY;
      const result = rawDateCellScheduleDayCodes(code);

      expect(result.length).toBe(1);
      expect(result[0]).toBe(code);
    });
  });

  describe('days string', () => {
    it('should filter none from the results.', () => {
      const code = DateCellScheduleDayCode.NONE;
      const result = rawDateCellScheduleDayCodes(code.toString() as DateCellScheduleEncodedWeek);
      expect(result.length).toBe(0);
    });

    it('should return an array from a single day code string', () => {
      const code = DateCellScheduleDayCode.SUNDAY;
      const result = rawDateCellScheduleDayCodes(code.toString() as DateCellScheduleEncodedWeek);

      expect(result.length).toBe(1);
      expect(result[0]).toBe(code);
    });

    it('should return the weekend token', () => {
      const code = DateCellScheduleDayCode.WEEKEND;
      const result = rawDateCellScheduleDayCodes(code.toString() as DateCellScheduleEncodedWeek);

      expect(result.length).toBe(1);
      expect(result[0]).toBe(code);
    });
  });
});

describe('dateCellScheduleEncodedWeek()', () => {
  it('should return an empty string if only NONE is provided.', () => {
    const codes = [DateCellScheduleDayCode.NONE];
    const result = dateCellScheduleEncodedWeek(codes);
    expect(result).toBe('');
  });

  it('should return an empty string if an empty array is provided.', () => {
    const codes: DateCellScheduleDayCode[] = [];
    const result = dateCellScheduleEncodedWeek(codes);
    expect(result).toBe('');
  });

  it('should return the weekdays that are is provided.', () => {
    const codes = range(DateCellScheduleDayCode.MONDAY, DateCellScheduleDayCode.THURSDAY + 1);
    const result = dateCellScheduleEncodedWeek(codes);
    expect(result).toBe('2345');
  });

  it('should return sunday only.', () => {
    const codes = [DateCellScheduleDayCode.SUNDAY];
    const result = dateCellScheduleEncodedWeek(codes);
    expect(result).toBe('1');
  });

  it('should return saturday only.', () => {
    const codes = [DateCellScheduleDayCode.SATURDAY];
    const result = dateCellScheduleEncodedWeek(codes);
    expect(result).toBe('7');
  });

  it('should return the weekday and weekend code if the entire week is provided.', () => {
    const codes = range(DateCellScheduleDayCode.NONE, DateCellScheduleDayCode.SATURDAY + 1);
    const result = dateCellScheduleEncodedWeek(codes);
    expect(result).toBe('89');
  });

  it('should return the weekday code if all weekdays are provided.', () => {
    const codes = range(DateCellScheduleDayCode.MONDAY, DateCellScheduleDayCode.SATURDAY);
    const result = dateCellScheduleEncodedWeek(codes);
    expect(result).toBe('8');
  });

  it('should return the weekend code if all weekenddays are provided.', () => {
    const codes = [DateCellScheduleDayCode.SATURDAY, DateCellScheduleDayCode.SUNDAY];
    const result = dateCellScheduleEncodedWeek(codes);
    expect(result).toBe('9');
  });
});

describe('dateCellScheduleDayCodeFactory()', () => {
  describe('function', () => {
    const utc2022Week2StartDate = new Date('2022-01-02T00:00:00Z');
    const utc2022Week2MondayDate = new Date('2022-01-03T00:00:00Z');

    describe('with timezone', () => {
      describe('UTC', () => {
        const factory = dateCellScheduleDayCodeFactory({ timezone: UTC_TIMEZONE_STRING });

        it('should return Sunday.', () => {
          const result = factory(utc2022Week2StartDate);
          expect(result).toBe(DateCellScheduleDayCode.SUNDAY);
        });

        it('should return Monday.', () => {
          const result = factory(utc2022Week2MondayDate);
          expect(result).toBe(DateCellScheduleDayCode.MONDAY);
        });
      });

      describe('America/Denver', () => {
        const factory = dateCellScheduleDayCodeFactory({ timezone: 'America/Denver' });

        it('should return Saturday.', () => {
          const result = factory(utc2022Week2StartDate);
          expect(result).toBe(DateCellScheduleDayCode.SATURDAY);
        });

        it('should return Sunday.', () => {
          const result = factory(utc2022Week2MondayDate);
          expect(result).toBe(DateCellScheduleDayCode.SUNDAY);
        });
      });

      describe('Europe/Amsterdam', () => {
        const factory = dateCellScheduleDayCodeFactory({ timezone: 'Europe/Amsterdam' });

        it('should return Sunday.', () => {
          const result = factory(utc2022Week2StartDate);
          expect(result).toBe(DateCellScheduleDayCode.SUNDAY);
        });

        it('should return Monday.', () => {
          const result = factory(utc2022Week2MondayDate);
          expect(result).toBe(DateCellScheduleDayCode.MONDAY);
        });
      });
    });
  });
});

describe('dateCellScheduleDayCodesAreSetsEquivalent()', () => {
  it('should be true when the sets are set equivalent', () => {
    const result = dateCellScheduleDayCodesAreSetsEquivalent(weekendDateCellScheduleDayCodes(), [DateCellScheduleDayCode.WEEKEND]);
    expect(result).toBe(true);
  });

  it('should be false when the sets are not set equivalent', () => {
    const result = dateCellScheduleDayCodesAreSetsEquivalent(weekendDateCellScheduleDayCodes(), [DateCellScheduleDayCode.WEEKDAY]);
    expect(result).toBe(false);
  });
});

describe('isSameDateCellSchedule()', () => {
  it('should return true for the same date schedule.', () => {
    const schedule: DateCellSchedule = { w: '89', ex: [0, 1], d: [2] };
    expect(isSameDateCellSchedule(schedule, schedule)).toBe(true);
  });

  it('should return false for a date schedule with different ex days.', () => {
    const schedule: DateCellSchedule = { w: '89', ex: [0, 1], d: [2] };
    const scheduleB: DateCellSchedule = { ...schedule, ex: [] };
    expect(isSameDateCellSchedule(schedule, scheduleB)).toBe(false);
  });

  it('should return false for a date schedule with different d days.', () => {
    const schedule: DateCellSchedule = { w: '89', ex: [0, 1], d: [2] };
    const scheduleB: DateCellSchedule = { ...schedule, d: [] };
    expect(isSameDateCellSchedule(schedule, scheduleB)).toBe(false);
  });
});

describe('dateCellTimingForExpandDateCellScheduleRangeInput()', () => {
  const schedule: DateCellSchedule = { w: '89', ex: [0, 1], d: [2] };

  describe('timing with timezone', () => {
    describe('UTC', () => {
      const days = 7;
      const duration = 60;
      const utc2022Week2StartDate = new Date('2022-01-02T00:00:00Z'); // sunday
      const timing = dateCellTiming({ startsAt: utc2022Week2StartDate, duration }, days, 'UTC');

      it('it should generate the expected dateCellTiming.', () => {
        const result = dateCellTimingForExpandDateCellScheduleRangeInput({
          dateCellScheduleRange: {
            ...schedule,
            ...timing
          },
          startsAtTime: timing.startsAt,
          duration
        });

        expect(result.startsAt).toBeSameSecondAs(timing.startsAt);
        expect(result.end).toBeSameSecondAs(timing.end);
      });
    });

    describe('America/New_York', () => {
      const timezone = 'America/New_York';
      const startOfDay = startOfDayInTimezoneFromISO8601DayString('2022-01-02', timezone);
      const startsAt = addHours(startOfDay, 12); // Noon on 2022-01-02 in America/New_York
      const timing = dateCellTiming({ startsAt, duration: 30 }, 1, timezone);

      it('should generate a valid DateCellTiming with the new duration and same duration.', () => {
        expect(timing.timezone).toBe(timezone);

        const newDuration = 60;

        const result = dateCellTimingForExpandDateCellScheduleRangeInput({
          dateCellScheduleRange: {
            ...schedule,
            ...timing
          },
          startsAtTime: timing.startsAt,
          duration: newDuration
        });

        expect(result.startsAt).toBeSameSecondAs(timing.startsAt);
        expect(result.duration).toBe(newDuration);
        expect(result.startsAt).toBeSameSecondAs(timing.startsAt);

        const durationDifference = newDuration - timing.duration;
        expect(result.end).toBeSameSecondAs(addMinutes(timing.end, durationDifference)); // 30 minutes later
      });

      it('should generate a valid DateCellTiming with the same event startsAt time and duration.', () => {
        const newStartsAt = addDays(timing.startsAt, 1); // same event schedule

        const result = dateCellTimingForExpandDateCellScheduleRangeInput({
          dateCellScheduleRange: {
            ...schedule,
            ...timing
          },
          duration: timing.duration,
          startsAtTime: newStartsAt
        });

        expect(result.duration).toBe(timing.duration);
        expect(result.startsAt).toBeSameSecondAs(timing.startsAt);
        expect(result.startsAt).toBeSameSecondAs(timing.startsAt);
        expect(result.end).toBeSameSecondAs(timing.end);
      });

      it('should generate a valid DateCellTiming with the new duration and startsAt at time.', () => {
        const newDuration = 45;
        const hoursDifference = 1;
        const newStartsAt = addHours(timing.startsAt, hoursDifference); // starts 1 hour earlier, and event is 1 day later
        const expectedEnd = addMinutes(timing.end, hoursDifference * MINUTES_IN_HOUR - newDuration);

        const result = dateCellTimingForExpandDateCellScheduleRangeInput({
          dateCellScheduleRange: {
            ...schedule,
            ...timing
          },
          duration: newDuration,
          startsAtTime: newStartsAt
        });

        expect(result.startsAt).toBeSameSecondAs(newStartsAt);
        expect(result.duration).toBe(newDuration);
        expect(result.end).toBeSameSecondAs(expectedEnd);
      });
    });
  });
});

describe('expandDateCellScheduleRange()', () => {
  const duration = 60;

  const days = 7;
  const utc2022Week2StartDate = new Date('2022-01-02T00:00:00Z'); // sunday
  const timing = dateCellTiming({ startsAt: utc2022Week2StartDate, duration }, days, 'UTC');
  const { timezone, end } = timing;

  it('should expand the dateCellScheduleRange week.', () => {
    const dateCellScheduleRange: DateCellScheduleRange = {
      w: '89',
      startsAt: utc2022Week2StartDate,
      end,
      timezone
    };

    const expansion = expandDateCellScheduleRange({ dateCellScheduleRange, duration });
    expect(expansion.length).toBe(7);

    expect(expansion[0].startsAt).toBeSameSecondAs(dateCellScheduleRange.startsAt);
  });

  it('should expand a week with excluded days.', () => {
    const dateCellScheduleRange: DateCellScheduleRange = {
      w: '89',
      startsAt: utc2022Week2StartDate,
      end,
      ex: [0, 2, 4, 6],
      timezone
    };

    const expansion = expandDateCellScheduleRange({ dateCellScheduleRange, duration });
    expect(expansion.length).toBe(3);

    expect(expansion[0].startsAt).toBeSameSecondAs(addDays(dateCellScheduleRange.startsAt, 1));

    const indexes = expansion.map((x) => x.i);
    expect(indexes).toContain(1);
    expect(indexes).toContain(3);
    expect(indexes).toContain(5);
  });

  it('should expand a week with included days.', () => {
    const dateCellScheduleRange: DateCellScheduleRange = {
      w: '8',
      startsAt: utc2022Week2StartDate,
      end,
      d: [0],
      timezone
    };

    const expansion = expandDateCellScheduleRange({ dateCellScheduleRange, duration });
    expect(expansion.length).toBe(6);

    expect(expansion[0].startsAt).toBeSameSecondAs(dateCellScheduleRange.startsAt);
  });

  it('should expand a week with only weekdays.', () => {
    const dateCellScheduleRange: DateCellScheduleRange = {
      w: '8',
      startsAt: utc2022Week2StartDate,
      end,
      timezone
    };

    const expansion = expandDateCellScheduleRange({ dateCellScheduleRange, duration });
    expect(expansion.length).toBe(5);

    expect(expansion[0].startsAt).toBeSameSecondAs(addDays(dateCellScheduleRange.startsAt, 1));
  });

  it('should expand a week with only weekends.', () => {
    const dateCellScheduleRange: DateCellScheduleRange = {
      w: '9',
      startsAt: utc2022Week2StartDate,
      end,
      timezone
    };

    const expansion = expandDateCellScheduleRange({ dateCellScheduleRange, duration });
    expect(expansion.length).toBe(2);

    expect(expansion[0].startsAt).toBeSameSecondAs(dateCellScheduleRange.startsAt);
  });

  describe('scenario', () => {
    describe('CST daylight saving timing change', () => {
      const duration = 1;

      const dateCellScheduleRange: DateCellScheduleRange = {
        startsAt: new Date('2023-08-15T05:00:00.000Z'),
        end: new Date('2023-12-21T22:30:00.000Z'),
        w: '89',
        ex: [],
        timezone
      };

      it('should expand all the days', () => {
        const timing = dateCellTimingForExpandDateCellScheduleRangeInput({ dateCellScheduleRange, duration });

        const completeRange = dateCellIndexRange(timing);
        const daysInBetween = differenceInDays(dateCellScheduleRange.end, dateCellScheduleRange.startsAt) + 1;

        expect(completeRange.minIndex).toBe(0);
        expect(completeRange.maxIndex).toBe(daysInBetween); // 129

        const expansion = expandDateCellScheduleRange({ dateCellScheduleRange, duration });
        const lastDay = lastValue(expansion);
        const expectedEndDateRange = durationSpanToDateRange(lastDay);

        expect(expectedEndDateRange.end).toBeSameSecondAs(timing.end); // should have the same end
        expect(expansion.length).toBe(daysInBetween);
      });
    });
  });
});

describe('expandDateCellScheduleRangeToDateCellRanges()', () => {
  const duration = 60;
  const days = 7;
  const timezone = 'UTC';
  const utc2022Week2StartDate = new Date('2022-01-02T00:00:00Z'); // sunday
  const timing = dateCellTiming({ startsAt: utc2022Week2StartDate, duration }, days, timezone);
  const end = timing.end;

  it('should expand a week.', () => {
    const dateCellScheduleRange: DateCellScheduleRange = {
      w: '89',
      startsAt: utc2022Week2StartDate,
      end,
      timezone
    };

    const expansion = expandDateCellScheduleRangeToDateCellRanges({ dateCellScheduleRange, duration });
    expect(expansion.length).toBe(1);

    expect(expansion[0].i).toBe(0);
    expect(expansion[0].to).toBe(6);
  });
});
