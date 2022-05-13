import { combineLatest, filter, skipWhile, startWith, switchMap, timeout, MonoTypeOperatorFunction, Observable, of, OperatorFunction, map, delay } from 'rxjs';
import { GetterOrValue, getValueFromGetter, Maybe } from '@dereekb/util';

// MARK: Types
export type IsCheckFunction<T = any> = (value: T) => Observable<boolean>;

/**
 * Function that validates the input value and returns an observable.
 */
export type IsValidFunction<T = any> = IsCheckFunction<T>;

/**
 * Function that checks modification status of the input value and returns a value.
 */
export type IsModifiedFunction<T = any> = IsCheckFunction<T>;

// MARK: IsCheck
export function makeReturnIfIsFunction<T>(isCheckFunction: Maybe<IsModifiedFunction<T>>, defaultValueOnMaybe?: boolean): (value: Maybe<T>) => Observable<Maybe<T>> {
  return (value) => returnIfIs(isCheckFunction, value, defaultValueOnMaybe);
}

export function returnIfIs<T>(isCheckFunction: Maybe<IsModifiedFunction<T>>, value: Maybe<T>, defaultValueOnMaybe?: boolean): Observable<Maybe<T>> {
  return checkIs<T>(isCheckFunction, value, defaultValueOnMaybe).pipe(map(x => (x) ? value : undefined));
}

export function makeCheckIsFunction<T>(isCheckFunction: Maybe<IsModifiedFunction<T>>, defaultValueOnMaybe?: boolean): (value: Maybe<T>) => Observable<boolean> {
  return (value) => checkIs(isCheckFunction, value, defaultValueOnMaybe);
}

export function checkIs<T>(isCheckFunction: Maybe<IsModifiedFunction<T>>, value: Maybe<T>, defaultValueOnMaybe = false): Observable<boolean> {
  const is: Observable<boolean> = (isCheckFunction) ?
    ((value != null) ? isCheckFunction(value) : of(defaultValueOnMaybe)) :
    of(true);
  return is;
}

// MARK: Filter
/**
 * Observable filter that filters maybe value that are defined.
 */
export function filterMaybe<T>(): OperatorFunction<Maybe<T>, T> {
  return filter(x => x != null) as OperatorFunction<Maybe<T>, T>;
}

/**
 * Skips all initial maybe values, and then returns all values after the first non-null/undefined value is returned.
 */
export function skipFirstMaybe<T>(): MonoTypeOperatorFunction<T> {
  return skipWhile((x: T) => (x == null));
}

/**
 * Provides a switchMap that will emit the observable if the observable is defined, otherwise will return the default value.
 * 
 * @param defaultValue 
 * @returns 
 */
export function switchMapMaybeDefault<T = any>(defaultValue: Maybe<T> = undefined): OperatorFunction<Maybe<Observable<Maybe<T>>>, Maybe<T>> {
  return switchMap((x: Maybe<Observable<Maybe<T>>>) => {
    if (x != null) {
      return x;
    } else {
      return of(defaultValue);
    }
  })
}

/**
 * Combines both filterMaybe and switchMap to build a subscriber that emits only concrete values.
 * 
 * @returns 
 */
export function switchMapMaybeObs<T = any>(): OperatorFunction<Maybe<Observable<Maybe<T>>>, T> {
  return (source: Observable<Maybe<Observable<Maybe<T>>>>) => {
    const subscriber: Observable<T> = source.pipe(
      filterMaybe(),
      switchMap(x => x)
    ) as Observable<T>;

    return subscriber;
  };
}

/**
 * Used to pass a default value incase an observable has not yet started emititng values.
 */
export function timeoutStartWith<T>(defaultValue: GetterOrValue<T>): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>) => {
    return source.pipe(
      timeout({ first: 0, with: () => source.pipe(startWith(getValueFromGetter(defaultValue))) })
    );
  };
}

/**
 * Combines both combineLatest with map values to an other value.
 * 
 * @param combineObs 
 * @param mapFn 
 * @returns 
 */
export function combineLatestMapFrom<A, B, C>(combineObs: Observable<B>, mapFn: (a: A, b: B) => C): OperatorFunction<A, C> {
  return (obs: Observable<A>) => combineLatest([obs, combineObs]).pipe(map(([a, b]) => mapFn(a, b)));
}

/**
 * Creates an observable that emits a starting value, then a second value after a delay.
 * 
 * If the delay is not provided, or is falsy, then the second value is never emitted.
 */
export function emitDelayObs<T>(startWith: T, endWith: T, delayTime: Maybe<number>): Observable<T> {
  let obs = of(startWith);

  if (delayTime) {
    obs = obs.pipe(emitAfterDelay(endWith, delayTime));
  }

  return obs;
}

/**
 * Emits a value after a given delay after every new emission.
 */
export function emitAfterDelay<T>(value: T, delayTime: number): MonoTypeOperatorFunction<T> {
  return (obs: Observable<T>) => obs.pipe(
    switchMap((x) =>
      of(value).pipe(
        delay(delayTime),
        startWith(x)
      )
    )
  );
}
