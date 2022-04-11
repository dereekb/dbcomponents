import { FieldOfType, PrimativeKey, ReadKeyFunction } from "./key";
import { mapToObject } from "./object";
import { Maybe } from "./value/maybe";

// MARK: Types
export interface SeparateResult<T> {
  included: T[];
  excluded: T[];
}

export interface GroupingResult<T> {
  [key: string]: T[];
}

export type KeyedGroupingResult<T, O, K extends keyof O = keyof O> = {
  [k in K]: T[];
}

export interface PairsGroupingResult<T> {
  pairs: T[][];
  unpaired: T[];
}

export interface ArrayContentsDifferentParams<T, K extends PrimativeKey = PrimativeKey> {
  groupKeyFn: ReadKeyFunction<T, K>;
  isEqual: (a: T, b: T) => boolean;
}

/**
 * Configuration for RestoreOrderParams.
 */
export interface RestoreOrderParams<T, K extends number | string = number | string> {
  readKey: ReadKeyFunction<T, K>;
  /**
   * Optional function used to decide which value should be retained.
   */
  chooseRetainedValue?: (values: T[]) => T;
  /**
   * Whether or not new items should be excluded. If false, the new items are appended to the end of the result in the order they are accessed.
   * 
   * By default this is false.
   */
  excludeNewItems?: boolean;
}

// MARK: Functions
/**
 * Batches items from the input array into several batches of a maximum size.
 * 
 * @param array 
 * @param batchSize 
 * @returns 
 */
export function batch<T>(array: T[], batchSize: number): T[][] {
  array = [].concat(array as []); // Copy array before splicing it.
  const batch = [];

  while (array.length > 0) {
    batch.push(array.splice(0, batchSize));
  }

  return batch;
}

/**
 * Convenience function for calling restoreOrder with two arrays of values, instead of an array of keys and array of values.
 * 
 * @param orderValues 
 * @param values 
 * @param params 
 * @returns 
 */
export function restoreOrderWithValues<T, K extends PrimativeKey = PrimativeKey>(orderValues: T[], values: T[], params: RestoreOrderParams<T, K>): T[] {
  const { readKey } = params;
  const orderKeys = orderValues.map(x => readKey(x));
  return restoreOrder(orderKeys as K[], values, params);
}

/**
 * Restores the order to the input values based on their keys.
 * 
 * Duplicate values are passed to the chooseRetainedValue function past. When no function is provided, duplicates are ignored.
 */
export function restoreOrder<T, K extends PrimativeKey = PrimativeKey>(orderKeys: K[], values: T[], { readKey, chooseRetainedValue = (values: T[]) => values[0], excludeNewItems = false }: RestoreOrderParams<T, K>): T[] {
  const valuesMap = makeValuesGroupMap(values, readKey);
  const orderKeysMap = new Map<Maybe<K>, number>(orderKeys.map((x, i) => [x, i]));

  const restoredOrder: T[] = new Array<T>();
  const newItems: T[] = [];

  valuesMap.forEach((values: T[], key: Maybe<K>) => {
    const index = orderKeysMap.get(key);

    function getValue() {
      return (values.length > 1) ? chooseRetainedValue(values) : values[0];
    }

    if (index != null) {
      restoredOrder[index] = getValue();
    } else if (!excludeNewItems) {
      newItems.push(getValue());
    }
  });

  const result = [...restoredOrder, ...newItems].filter(x => x !== undefined);  // Allow null to be passed.
  return result;
}

/**
 * Returns true if the input differs from eachother.
 * 
 * Input items are uniquely keyed in some fashion. The same items are paired up.
 */
export function arrayContentsDiffer<T, K extends PrimativeKey = PrimativeKey>(a: T[] = [], b: T[] = [], { groupKeyFn, isEqual }: ArrayContentsDifferentParams<T, K>): boolean {
  let areDifferent = false;

  if (a.length === b.length) {
    const pairs = pairGroupValues([...a, ...b], groupKeyFn);

    if (pairs.unpaired) {
      // Any unpaired items means there is a difference.
      areDifferent = true;
    } else {
      for (const [aa, bb] of pairs.pairs) {
        // If any item is not the same, break.
        if (!isEqual(aa, bb)) {
          areDifferent = true;
          break;
        }
      }
    }
  } else {
    areDifferent = true;  // Different lengths, different content.
  }

  return areDifferent;
}

export function pairGroupValues<T, K extends PrimativeKey = PrimativeKey>(values: T[], groupKeyFn: ReadKeyFunction<T, K>): PairsGroupingResult<T> {
  const map = makeValuesGroupMap<T, K>(values, groupKeyFn);
  const pairs: T[][] = [];
  const unpaired: T[] = [];

  map.forEach((x: T[], key: Maybe<K>) => {
    if (x.length === 1) {
      unpaired.push(x[0]);
    } else {
      pairs.push(x);
    }
  });

  return {
    pairs,
    unpaired
  };
}

/**
 * Creates a tuples array of key and value pairs.
 * 
 * @param values 
 * @param keyFn 
 * @returns 
 */
export function makeKeyPairs<T, K extends string | number = string | number>(values: T[], keyFn: ReadKeyFunction<T, K>): [Maybe<K>, T][] {
  return values.map(x => ([keyFn(x), x]));
}

/**
 * Separates the input values into an included and excluded group.
 * 
 * @param values 
 * @param checkInclusion 
 * @returns 
 */
export function separateValues<T>(values: T[], checkInclusion: (x: T) => boolean): SeparateResult<T> {
  const result: KeyedGroupingResult<T, { in: any, out: any }> = groupValues(values, (x) => {
    return (checkInclusion(x)) ? 'in' : 'out';
  });

  return {
    included: result.in || [],
    excluded: result.out || []
  };
}

/**
 * Convenience function for makeValuesGroupMap that returns a POJO instead of a Map.
 * 
 * @param values 
 * @param groupKeyFn 
 */
export function groupValues<T, R, K extends PrimativeKey & keyof R>(values: T[], groupKeyFn: ReadKeyFunction<T, K>): KeyedGroupingResult<T, R, K>;
export function groupValues<T, K extends PrimativeKey = PrimativeKey>(values: T[], groupKeyFn: ReadKeyFunction<T, K>): GroupingResult<T>;
export function groupValues<T, K extends PrimativeKey = PrimativeKey>(values: T[], groupKeyFn: ReadKeyFunction<T, K>): GroupingResult<T> {
  const map = makeValuesGroupMap<T, K>(values, groupKeyFn);
  return mapToObject(map as any);
}

/**
 * Reads keys from the values in the arrays, and groups them together into a Map.
 * 
 * @param values 
 * @param groupKeyFn 
 * @returns 
 */
export function makeValuesGroupMap<T, K extends PrimativeKey = PrimativeKey>(values: T[], groupKeyFn: ReadKeyFunction<T, K>): Map<Maybe<K>, T[]> {
  const map = new Map<Maybe<K>, T[]>();

  values.forEach((x) => {
    const key = groupKeyFn(x);
    let array = map.get(key);

    if (array != null) {
      array.push(x);
    } else {
      map.set(key, [x]);
    }
  });

  return map;
}
