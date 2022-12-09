import { map, Observable, combineLatest, of } from 'rxjs';
import { allKeyValueTuples, Building } from '@dereekb/util';
import { asObservable } from './getter';

/**
 * Creates a map function that maps the input Map to an Observable that returns values mapped from the map's values.
 *
 * @param mapToObs
 * @returns
 */
export function combineLatestFromMapValuesObsFn<T, O>(mapToObs: (value: T) => Observable<O>): (map: Map<unknown, T>) => Observable<O[]> {
  const combineArrayFn = combineLatestFromArrayObsFn(mapToObs);
  return (latestMap: Map<unknown, T>) => {
    const mapValues = Array.from(latestMap).map((y) => y[1]);
    return combineArrayFn(mapValues);
  };
}

export function combineLatestFromArrayObsFn<T, O>(mapToObs: (value: T) => Observable<O>): (values: T[]) => Observable<O[]> {
  return (latest) => {
    const newObs = latest.map(mapToObs);
    return newObs.length ? combineLatest(newObs) : of([]);
  };
}

// MARK: Object Map
export type ObservableObjectMap = object;

export type ObservableObjectMapResult<T extends ObservableObjectMap> = {
  [K in keyof T]: T[K] extends Observable<infer O> ? O : T[K];
};

export function combineLatestFromObject<T extends ObservableObjectMap>(objectMap: T): Observable<ObservableObjectMapResult<T>> {
  const pairs = allKeyValueTuples(objectMap);
  const observables = pairs.map((x) => asObservable(x[1]).pipe(map((value) => [x[0], value] as [keyof T, unknown])));

  return combineLatest(observables).pipe(
    map((latestValues) => {
      const result: Building<ObservableObjectMapResult<T>> = {};

      latestValues.forEach(([key, value]) => {
        result[key] = value as any;
      });

      return result as ObservableObjectMapResult<T>;
    })
  );
}
