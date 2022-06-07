import { FilterFunction, invertFilter } from '../filter/filter';

// MARK: For Each
export type ForEachKeyValueTupleFunction<T extends object = object, K extends keyof T = keyof T> = (tuple: KeyValueTuple<T, K>, index: number) => void;

export interface ForEachKeyValue<T extends object = object, K extends keyof T = keyof T> {
  filter?: FilterKeyValueTuplesInput<T, K>;
  forEach: ForEachKeyValueTupleFunction<T, K>;
}

export function forEachKeyValue<T extends object = object, K extends keyof T = keyof T>(obj: T, { forEach, filter }: ForEachKeyValue<T, K>): void {
  const keyValues = filterKeyValueTuples<T, K>(obj, filter);
  keyValues.forEach(forEach);
}

export function filterKeyValueTuples<T extends object = object, K extends keyof T = keyof T>(obj: T, filter?: FilterKeyValueTuplesInput<T, K>): KeyValueTuple<T, K>[] {
  return filterKeyValueTuplesFunction(filter)(obj);
}

// MARK: Tuples
/**
 * A Key-Value pair within an Tuple array value.
 */
export type KeyValueTuple<T extends object = object, K extends keyof T = keyof T> = [K, T[K]];

export type FilterKeyValueTuplesFunction<T extends object = object, K extends keyof T = keyof T> = (obj: T) => KeyValueTuple<T, K>[];

export function filterKeyValueTuplesFunction<T extends object = object, K extends keyof T = keyof T>(filter?: FilterKeyValueTuplesInput<T, K>): FilterKeyValueTuplesFunction<T, K> {
  if (filter) {
    const filterFn = filterKeyValueTupleFunction<T, K>(filter);

    return (obj: T) => {
      return (allKeyValueTuples(obj) as KeyValueTuple<T, K>[]).filter(filterFn);
    };
  } else {
    return allKeyValueTuples;
  }
}

export function allKeyValueTuples<T extends object = object, K extends keyof T = keyof T>(obj: T): KeyValueTuple<T, K>[] {
  return Object.entries(obj) as KeyValueTuple<T, K>[];
}

export type FilterKeyValueTuplesInput<T extends object = object, K extends keyof T = keyof T> = KeyValueTypleValueFilter | KeyValueTupleFilter<T, K>;

export enum KeyValueTypleValueFilter {
  /**
   * No filter
   */
  NONE = 0,
  /**
   * Only undefined values.
   */
  UNDEFINED = 1,
  /**
   * All values that are null or undefined.
   */
  NULL = 2,
  /**
   * All values that are falsy.
   */
  FALSY = 3
}

export interface KeyValueTupleFilter<T extends object = object, K extends keyof T = keyof T> {
  valueFilter?: KeyValueTypleValueFilter;
  invertFilter?: boolean;
  keysFilter?: K[];
}

/**
 * Converts an input FilterKeyValueTuplesInput to a KeyValueTupleFilter.
 *
 * @param input
 * @returns
 */
export function filterKeyValueTuplesInputToFilter<T extends object = object, K extends keyof T = keyof T>(input: FilterKeyValueTuplesInput<T, K>): KeyValueTupleFilter<T, K> {
  if (typeof input === 'number') {
    return { valueFilter: input };
  } else {
    return input;
  }
}

export type FilterKeyValueTupleFunction<T extends object = object, K extends keyof T = keyof T> = FilterFunction<KeyValueTuple<T, K>>;

export function filterKeyValueTupleFunction<T extends object = object, K extends keyof T = keyof T>(input: FilterKeyValueTuplesInput<T, K>): FilterKeyValueTupleFunction<T, K> {
  const filter = typeof input === 'object' ? (input as KeyValueTupleFilter<T, K>) : { valueFilter: input };
  const { valueFilter: type, invertFilter: inverseFilter = false, keysFilter }: KeyValueTupleFilter<T, K> = filter;

  let filterFn: FilterKeyValueTupleFunction<T, K>;

  switch (type) {
    case KeyValueTypleValueFilter.UNDEFINED:
      filterFn = ([, x]) => x !== undefined;
      break;
    case KeyValueTypleValueFilter.NULL:
      filterFn = ([, x]) => x != null;
      break;
    case KeyValueTypleValueFilter.FALSY:
      filterFn = ([, x]) => Boolean(x);
      break;
    case KeyValueTypleValueFilter.NONE:
    default:
      filterFn = () => true;
      break;
  }

  if (keysFilter) {
    const filterByTypeFn = filterFn as FilterKeyValueTupleFunction<T, K>;
    const keysSet = new Set(keysFilter);
    filterFn = (x, i) => filterByTypeFn(x, i) && keysSet.has(x[0]);
  }

  return invertFilter<KeyValueTuple<T, K>, FilterKeyValueTupleFunction<T, K>>(filterFn, inverseFilter);
}
