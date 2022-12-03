import { LogicalDateStringCode, Maybe, ReadableTimeString, ArrayOrValue, ISO8601DateString, asArray, filterMaybeValues, dateFromLogicalDate, DecisionFunction } from '@dereekb/util';
import { DateTimeMinuteConfig, DateTimeMinuteInstance, formatToISO8601DayString, guessCurrentTimezone, readableTimeStringToDate, toLocalReadableTimeString, toReadableTimeString, utcDayForDate, formatToISO8601DateString, toJsDate, parseISO8601DayStringToDate, safeToJsDate, findMinDate, findMaxDate, dateTimeMinuteDecisionFunction } from '@dereekb/date';
import { switchMap, shareReplay, map, startWith, tap, first, distinctUntilChanged, debounceTime, throttleTime, BehaviorSubject, Observable, combineLatest, Subject, merge, interval, of } from 'rxjs';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormControl, Validators, FormGroup } from '@angular/forms';
import { FieldType } from '@ngx-formly/material';
import { FieldTypeConfig, FormlyFieldProps } from '@ngx-formly/core';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { max as maxDate, min as minDate, addMinutes, isSameDay, isSameMinute, startOfDay, addDays } from 'date-fns';
import { filterMaybe, skipFirstMaybe, SubscriptionObject, switchMapMaybeDefault, tapLog } from '@dereekb/rxjs';

export enum DbxDateTimeFieldTimeMode {
  /**
   * Time is required.
   */
  REQUIRED = 'required',
  /**
   * Time is optional.
   */
  OPTIONAL = 'optional',
  /**
   * Time is permenantly off.
   */
  NONE = 'none'
}

export enum DbxDateTimeValueMode {
  /**
   * Value is returned/parsed as a Date.
   */
  DATE = 0,
  /**
   * Value is returned/parsed as an ISO8601DateString
   */
  DATE_STRING = 1,
  /**
   * Value is returned/parsed as an ISO8601DayString, relative to the current timezone.
   */
  DAY_STRING = 2
}

export function dbxDateTimeInputValueParseFactory(mode: DbxDateTimeValueMode): (date: Maybe<Date | string>) => Maybe<Date> {
  let factory: (date: Maybe<Date | string>) => Maybe<Date>;

  switch (mode) {
    case DbxDateTimeValueMode.DAY_STRING:
      factory = (x) => (typeof x === 'string' ? parseISO8601DayStringToDate(x) : x);
      break;
    case DbxDateTimeValueMode.DATE_STRING:
    case DbxDateTimeValueMode.DATE:
    default:
      factory = (x) => (x != null ? toJsDate(x) : x);
      break;
  }

  return factory;
}

export function dbxDateTimeOutputValueFactory(mode: DbxDateTimeValueMode): (date: Maybe<Date>) => Maybe<Date | string> {
  let factory: (date: Maybe<Date>) => Maybe<Date | string>;

  switch (mode) {
    case DbxDateTimeValueMode.DATE_STRING:
      factory = (x) => (x != null ? formatToISO8601DateString(x) : x);
      break;
    case DbxDateTimeValueMode.DAY_STRING:
      factory = (x) => (x != null ? formatToISO8601DayString(x) : x);
      break;
    case DbxDateTimeValueMode.DATE:
    default:
      factory = (x) => x;
      break;
  }

  return factory;
}

export type DateTimePickerConfiguration = Omit<DateTimeMinuteConfig, 'date'>;

export type DbxDateTimeFieldSyncType = 'before' | 'after';

export interface DbxDateTimeFieldSyncField {
  /**
   * Field key/path to sync with/against.
   */
  syncWith: string;
  /**
   * How to sync against the other field.
   */
  syncType: DbxDateTimeFieldSyncType;
}

export interface DbxDateTimeFieldProps extends FormlyFieldProps {
  /**
   * Custom date label.
   *
   * Defaults to Date
   */
  dateLabel?: string;

  /**
   * Custom time label.
   *
   * Defaults to Time
   */
  timeLabel?: string;

  /**
   * Value mode.
   *
   * Defaults to DATE
   */
  valueMode?: DbxDateTimeValueMode;

  /**
   * Whether or not the date is hidden, and automatically uses today/input date.
   */
  timeOnly?: boolean;

  /**
   * Whether or not the time can be added/removed optionally.
   *
   * This is ignored if timeOnly is specified.
   */
  timeMode?: DbxDateTimeFieldTimeMode;

  /**
   * Other form control for enabling/disabling whether or not it is a full day.
   *
   * This field is only used if time is optional.
   *
   * When time is off, the field is set to true.
   */
  fullDayFieldName?: string;

  /**
   * Whether or not to pass the date value as a UTC date, or a date in the current timezone.
   */
  fullDayInUTC?: boolean;

  /**
   * Whether or not ot hide the date hint info content.
   *
   * False by  default
   */
  hideDateHint?: boolean;

  /**
   * Used for returning the configuration observable.
   */
  getConfigObs?: () => Observable<DateTimePickerConfiguration>;

  /**
   * Used for syncing with one or more fields with a Date value.
   */
  getSyncFieldsObs?: () => Observable<ArrayOrValue<DbxDateTimeFieldSyncField>>;
}

export interface DbxDateTimeFieldSyncParsedField extends Pick<DbxDateTimeFieldSyncField, 'syncType'> {
  control: AbstractControl<Maybe<Date | ISO8601DateString>>;
}

export function syncConfigValueObs(parseConfigsObs: Observable<DbxDateTimeFieldSyncParsedField[]>, type: DbxDateTimeFieldSyncType): Observable<Date | null> {
  return parseConfigsObs.pipe(
    switchMap((x) => {
      const config = x.find((y) => y.syncType === type);
      let result: Observable<Date | null>;

      if (config) {
        const { control } = config;
        result = control.valueChanges.pipe(
          startWith(control.value),
          map((x) => safeToJsDate(x) ?? null)
        );
      } else {
        result = of(null);
      }

      return result;
    }),
    distinctUntilChanged(),
    shareReplay(1)
  );
}

@Component({
  templateUrl: 'datetime.field.component.html'
})
export class DbxDateTimeFieldComponent extends FieldType<FieldTypeConfig<DbxDateTimeFieldProps>> implements OnInit, OnDestroy {
  private _sub = new SubscriptionObject();
  private _valueSub = new SubscriptionObject();

  private _fullDayInputCtrl?: FormControl;
  private _fullDayControlObs = new BehaviorSubject<Maybe<AbstractControl>>(undefined);
  readonly fullDayControl$ = this._fullDayControlObs.pipe(filterMaybe());

  private _offset = new BehaviorSubject<number>(0);
  private _formControlObs = new BehaviorSubject<Maybe<AbstractControl>>(undefined);
  readonly formControl$ = this._formControlObs.pipe(filterMaybe());

  private _updateTime = new Subject<void>();

  readonly value$ = this.formControl$.pipe(
    switchMap((control) => control.valueChanges.pipe(startWith(control.value), map(dbxDateTimeInputValueParseFactory(this.valueMode)))),
    distinctUntilChanged((a, b) => (a != null && b != null ? isSameMinute(a, b) : a === b)),
    shareReplay(1)
  );

  /**
   * Used to trigger/display visual updates (specifically on timeDistance, etc.).
   */
  readonly displayValue$ = interval(10 * 1000).pipe(
    startWith(0),
    map(() => new Date().getMinutes()),
    distinctUntilChanged(),
    tap(() => this.cdRef.markForCheck()),
    switchMap(() => this.value$),
    shareReplay(1)
  );

  readonly timeString$: Observable<ReadableTimeString> = this.value$.pipe(
    filterMaybe(),
    map((x) => {
      const timezone = guessCurrentTimezone();
      const timeString = toReadableTimeString(x, timezone);
      return timeString;
    })
  );

  readonly dateInputCtrl = new FormControl(new Date(), {
    validators: []
  });

  readonly timeInputCtrl = new FormControl('', {
    validators: [Validators.pattern(/^(now)$|^([0-9]|(0[0-9])|(1[0-9])|(2[0-3]))(:)?([0-5][0-9])?(\s)?([apAP][Mm])?(\\s)*$/)]
  });

  private _config = new BehaviorSubject<Maybe<Observable<DateTimePickerConfiguration>>>(undefined);
  private _syncConfigObs = new BehaviorSubject<Maybe<Observable<ArrayOrValue<DbxDateTimeFieldSyncField>>>>(undefined);

  get dateLabel(): string {
    return this.props.dateLabel ?? 'Date';
  }

  get timeLabel(): string {
    return this.props.timeLabel ?? 'Time';
  }

  get dateOnly(): boolean {
    return this.timeMode === DbxDateTimeFieldTimeMode.NONE;
  }

  get dateTimeField(): DbxDateTimeFieldProps {
    return this.field.props;
  }

  get timeOnly(): Maybe<boolean> {
    return this.dateTimeField.timeOnly;
  }

  get showDateInput(): boolean {
    return !this.timeOnly;
  }

  get timeMode(): DbxDateTimeFieldTimeMode {
    return this.timeOnly ? DbxDateTimeFieldTimeMode.REQUIRED : this.dateTimeField.timeMode ?? DbxDateTimeFieldTimeMode.REQUIRED;
  }

  get valueMode(): DbxDateTimeValueMode {
    return this.field.props.valueMode ?? DbxDateTimeValueMode.DATE;
  }

  get description(): Maybe<string> {
    return this.field.props.description;
  }

  get hideDateHint(): boolean {
    return this.field.props.hideDateHint ?? false;
  }

  readonly fullDay$: Observable<boolean> = this.fullDayControl$.pipe(switchMap((control) => control.valueChanges.pipe(startWith(control.value))));

  readonly showTimeInput$: Observable<boolean> = this.fullDay$.pipe(map((x) => !x && this.timeMode !== DbxDateTimeFieldTimeMode.NONE));

  readonly showAddTime$ = this.showTimeInput$.pipe(
    map((x) => !x && this.timeMode === DbxDateTimeFieldTimeMode.OPTIONAL),
    shareReplay(1)
  );

  readonly date$ = this.dateInputCtrl.valueChanges.pipe(startWith(this.dateInputCtrl.value), filterMaybe(), shareReplay(1));

  readonly dateValue$: Observable<Date | null> = merge(this.date$, this.value$.pipe(skipFirstMaybe())).pipe(
    map((x: Maybe<Date>) => (x ? startOfDay(x) : null)),
    distinctUntilChanged((a, b) => a != null && b != null && isSameDay(a, b)),
    shareReplay(1)
  );

  readonly timeInput$: Observable<ReadableTimeString> = this._updateTime.pipe(
    debounceTime(5),
    map(() => this.timeInputCtrl.value || ''),
    distinctUntilChanged()
  );

  readonly syncConfigObs$ = this._syncConfigObs.pipe(switchMapMaybeDefault(), shareReplay(1));

  readonly parsedSyncConfigs$: Observable<DbxDateTimeFieldSyncParsedField[]> = this.syncConfigObs$.pipe(
    map((x) => {
      let parsed: DbxDateTimeFieldSyncParsedField[];

      if (x) {
        parsed = filterMaybeValues(
          asArray(x).map((y) => {
            const control = this.form.get(y.syncWith);

            if (control) {
              return {
                control,
                ...y
              };
            } else {
              return undefined;
            }
          })
        );
      } else {
        parsed = [];
      }

      return parsed;
    }),
    shareReplay(1)
  );

  readonly syncConfigBeforeValue$: Observable<Date | null> = syncConfigValueObs(this.parsedSyncConfigs$, 'before');
  readonly syncConfigAfterValue$: Observable<Date | null> = syncConfigValueObs(this.parsedSyncConfigs$, 'after');

  // TODO: Get min/max using the DateTimePickerConfiguration too

  readonly dateInputMin$: Observable<Date | null> = this.syncConfigBeforeValue$;
  readonly dateInputMax$: Observable<Date | null> = this.syncConfigAfterValue$;

  readonly rawDateTime$: Observable<Maybe<Date>> = combineLatest([this.dateValue$, this.timeInput$.pipe(startWith(null)), this.fullDay$]).pipe(
    map(([date, timeString, fullDay]) => {
      let result: Maybe<Date>;

      if (date) {
        if (fullDay) {
          if (this.dateTimeField.fullDayInUTC) {
            result = utcDayForDate(date);
          } else {
            result = startOfDay(date);
          }
        } else if (timeString) {
          result =
            readableTimeStringToDate(timeString, {
              date,
              useSystemTimezone: true
            }) ?? date;
        } else {
          result = date;
        }
      }

      return result;
    }),
    distinctUntilChanged<Maybe<Date>>((a, b) => a != null && b != null && isSameMinute(a, b)),
    shareReplay(1)
  );

  readonly config$ = combineLatest([this._config.pipe(switchMapMaybeDefault(), shareReplay(1)), this.dateInputMin$, this.dateInputMax$]).pipe(
    map(([x, dateInputMin, dateInputMax]) => {
      let result: Maybe<DateTimePickerConfiguration> = x;

      if (dateInputMin != null || dateInputMax != null) {
        const { min: limitMin, max: limitMax } = x?.limits ?? {};
        const min = findMinDate([dateInputMin, limitMin]);
        const max = findMaxDate([dateInputMax, limitMax]);

        result = {
          ...x,
          limits: {
            ...x?.limits,
            min,
            max
          }
        };
      }

      return result;
    }),
    distinctUntilChanged(),
    shareReplay(1)
  );

  readonly pickerFilter$: Observable<DecisionFunction<Date | null>> = this.config$.pipe(
    distinctUntilChanged(),
    map((x) => {
      if (x) {
        const filter = dateTimeMinuteDecisionFunction(x);
        return (x: Date | null) => (x != null ? filter(x) : true);
      } else {
        return () => true;
      }
    }),
    shareReplay(1)
  );

  readonly defaultPickerFilter: DecisionFunction<Date | null> = () => true;

  readonly timeOutput$: Observable<Maybe<Date>> = combineLatest([this.rawDateTime$, this._offset, this.config$]).pipe(
    throttleTime(40, undefined, { leading: false, trailing: true }),
    distinctUntilChanged((current, next) => current[0] === next[0] && next[1] === 0),
    tap(([, stepsOffset]) => (stepsOffset ? this._offset.next(0) : 0)),
    map(([date, stepsOffset, config]) => {
      if (date != null) {
        const instance = new DateTimeMinuteInstance({
          date,
          ...config,
          roundDownToMinute: true
        });

        date = instance.limit(date);
        const minutes = stepsOffset * 5;
        date = addMinutes(date, minutes);
      }

      return date;
    }),
    distinctUntilChanged((a, b) => a != null && b != null && isSameMinute(a, b)),
    shareReplay(1)
  );

  constructor(private readonly cdRef: ChangeDetectorRef) {
    super();
  }

  ngOnInit(): void {
    this._formControlObs.next(this.formControl);
    this._config.next(this.dateTimeField.getConfigObs?.());
    this._syncConfigObs.next(this.dateTimeField.getSyncFieldsObs?.());

    const valueFactory = dbxDateTimeOutputValueFactory(this.valueMode);

    this._sub.subscription = this.timeOutput$.pipe(skipFirstMaybe()).subscribe((dateValue) => {
      const value = valueFactory(dateValue);

      this.formControl.setValue(value);
      this.formControl.markAsDirty();
      this.formControl.markAsTouched();
    });

    this._valueSub.subscription = this.timeString$.subscribe((x) => {
      // Skip events where the timeInput value is cleared.
      if (!this.timeInputCtrl.value && x === '12:00AM') {
        return;
      }

      this.setTime(x);
    });

    // Watch for disabled changes so we can propogate them properly.
    this.formControl.registerOnDisabledChange((disabled) => {
      if (disabled) {
        this.dateInputCtrl.disable({ emitEvent: false });
        this.timeInputCtrl.disable({ emitEvent: false });
      } else {
        this.dateInputCtrl.enable({ emitEvent: false });
        this.timeInputCtrl.enable({ emitEvent: false });
      }
    });

    const isFullDayField = this.dateTimeField.fullDayFieldName;
    let fullDayFieldCtrl: Maybe<AbstractControl>;

    if (isFullDayField) {
      fullDayFieldCtrl = this.form.get(isFullDayField);
    }

    if (!fullDayFieldCtrl) {
      this._fullDayInputCtrl = new FormControl(true);

      // Set the control in the form too if the name is defined.
      if (isFullDayField) {
        (this.form as FormGroup).addControl(isFullDayField, this._fullDayInputCtrl);
      }

      fullDayFieldCtrl = this._fullDayInputCtrl;
    }

    this._fullDayControlObs.next(fullDayFieldCtrl);

    switch (this.dateTimeField.timeMode) {
      case DbxDateTimeFieldTimeMode.OPTIONAL:
        break;
      case DbxDateTimeFieldTimeMode.NONE:
        this.removeTime();
        break;
      case DbxDateTimeFieldTimeMode.REQUIRED:
        this.addTime();
        break;
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this._fullDayControlObs.complete();
    this._offset.complete();
    this._formControlObs.complete();
    this._config.complete();
    this._updateTime.complete();
    this._syncConfigObs.complete();
    this._sub.destroy();
    this._valueSub.destroy();
  }

  datePicked(event: MatDatepickerInputEvent<Date>): void {
    const date = event.value;

    if (date) {
      this.setDateInputValue(date);
    }
  }

  setLogicalTime(time: LogicalDateStringCode): void {
    const date = dateFromLogicalDate(time);

    if (date) {
      const timeString = toLocalReadableTimeString(date);
      this.setTime(timeString);
    }
  }

  setDateInputValue(date: Date) {
    this.dateInputCtrl.setValue(date);
    this._updateTime.next();
  }

  setTime(time: ReadableTimeString): void {
    this.timeInputCtrl.setValue(time);
    this._offset.next(0);
    this._updateTime.next();
  }

  keydownOnDateInput(event: KeyboardEvent): void {
    let direction = 0;

    switch (event.key?.toLowerCase()) {
      case 'arrowup':
        direction = 1;
        break;
      case 'arrowdown':
        direction = -1;
        break;
    }

    let offset = 1;

    if (event.ctrlKey && event.shiftKey) {
      offset = 365;
    } else if (event.ctrlKey) {
      offset = 30;
    } else if (event.shiftKey) {
      offset = 7;
    }

    if (direction !== 0) {
      this.date$.pipe(first()).subscribe((date) => {
        const newDate = addDays(date, offset * direction);
        this.setDateInputValue(newDate);
      });
    }
  }

  keydownOnTimeInput(event: KeyboardEvent): void {
    let direction = 0;

    switch (event.key?.toLowerCase()) {
      case 'arrowup':
        direction = 1;
        break;
      case 'arrowdown':
        direction = -1;
        break;
    }

    let offset = 1;

    if (event.altKey && event.shiftKey) {
      offset = 300;
    } else if (event.altKey) {
      offset = 60;
    } else if (event.shiftKey) {
      offset = 5;
    }

    if (direction !== 0) {
      this._offset.next(this._offset.value + offset * direction);
      this._updateTime.next();
    }
  }

  focusTime(): void {
    // do nothing
  }

  focusOutTime(): void {
    this._updateTime.next();
  }

  addTime(): void {
    this.setFullDay(false);
  }

  removeTime(): void {
    this.setFullDay(true);
  }

  setFullDay(fullDay: boolean): void {
    this.fullDayControl$.pipe(first()).subscribe((x) => {
      x.setValue(fullDay);
    });
  }
}
