import { Maybe } from "@dereekb/util";
import { baseDateToTargetDate } from "../date/date.timezone";
import { DateRRuleParseUtility, RRuleExdateAttribute } from "./date.rrule.parse";

describe('DateRRuleParseUtility', () => {

  describe('DSTART', () => {

    describe('repeat yearly', () => {

      /**
       * Repeat yearly
       */
      const yearlyRepeatingRule = 'DTSTART;TZID=America/Los_Angeles:20210611T110000';

      describe('separateRRuleStringSetValues()', () => {

        const rruleStringLineSet = [
          yearlyRepeatingRule
        ];

        it('should parse the date', () => {
          const results = DateRRuleParseUtility.separateRRuleStringSetValues(rruleStringLineSet);
          expect(results).toBeDefined();

          // todo

        });

      });


    });

  });

  describe('EXDATE handling', () => {

    /**
     * EXDATE with two of the same date defined.
     */
    const exdateLineA = 'EXDATE;TZID=America/Los_Angeles:20210611T110000,20210611T110000';
    const exdateLineADate = baseDateToTargetDate(new Date(Date.UTC(2021, (6 - 1), 11, 11, 0, 0)), 'America/Los_Angeles');

    /**
     * EXDATE with one UTC date defined.
     */
    const exdateLineB = 'EXDATE:20151225T173000Z';

    describe('separateRRuleStringSetValues()', () => {

      describe('rrule with EXDATE', () => {

        const rruleStringLineSet = [
          'RRULE:FREQ=WEEKLY',
          exdateLineA
        ];

        it('should parse the EXDATE values', () => {
          const results = DateRRuleParseUtility.separateRRuleStringSetValues(rruleStringLineSet);

          const exdatesArray = Array.from(results.exdates);

          expect(exdatesArray.length).toBe(1);
          expect(exdatesArray[0]).toBeSameSecondAs(exdateLineADate);
        });

      });

    });

    describe('parseExdateAttributeFromLine()', () => {

      function describeLineTests(line: string, { hasTimezone = false, testValue = undefined as Maybe<((result: RRuleExdateAttribute) => void)> }) {

        it('should parse the exdate', () => {
          const result = DateRRuleParseUtility.parseExdateAttributeFromLine(line);
          expect(result.dates).toBeDefined();
          expect(result.dates.length).toBeGreaterThanOrEqual(1);
          expect(Boolean(result.timezone)).toBe(hasTimezone);
        });

        if (testValue) {
          it('should pass test value test', () => {
            const result = DateRRuleParseUtility.parseExdateAttributeFromLine(line);
            testValue(result);
          });
        }

      }

      describe('exdateLineA', () => {
        describeLineTests(exdateLineA, {
          hasTimezone: true,
          testValue: (result) => {
            expect(result.dates[0]).toBeSameSecondAs(exdateLineADate);
            expect(result.dates.length).toBe(2);
          }
        });
      });

      describe('exdateLineB', () => {
        describeLineTests(exdateLineB, { hasTimezone: false });
      });

    });

    describe('parseProperty', () => {

      it('should parse an exdate property.', () => {
        const property = DateRRuleParseUtility.parseProperty(exdateLineA);
        expect(property).toBeDefined();
        expect(property.type).toBe('EXDATE');
        expect(property.params.length).toBe(1);
        expect(property.params[0].key).toBe('TZID');
        expect(property.params[0].value).toBe('America/Los_Angeles');
        expect(property.values).toBeDefined();
        expect(property.values).toBe('20210611T110000,20210611T110000');
      });

    });

    describe('parseDateTimeString', () => {

      it('should parse a local date when a timezone is provided.', () => {
        const date = DateRRuleParseUtility.parseDateTimeStringWithTimezone('20210611T110000', 'America/Los_Angeles');
        expect(date).toBeSameSecondAs(exdateLineADate);
      });

    });

    describe('toRRuleStringSet()', () => {

      const rruleStringLineSet = [
        'RRULE:FREQ=WEEKLY',
        exdateLineA
      ];

      it('should split rules lines', () => {
        const linesString = DateRRuleParseUtility.toRRuleLines(rruleStringLineSet);
        const stringSet = DateRRuleParseUtility.toRRuleStringSet(linesString);

        expect(stringSet.length).toBe(2);
        expect(stringSet[0]).toBe(rruleStringLineSet[0]);
        expect(stringSet[1]).toBe(rruleStringLineSet[1]);
      });

    });

  });


});
