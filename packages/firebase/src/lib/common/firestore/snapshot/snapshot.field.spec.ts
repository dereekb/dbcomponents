import { asGetter, ISO8601DateString, Maybe, modelFieldMapFunctions, objectHasKey } from '@dereekb/util';
import { isValid } from 'date-fns';
import { FirestoreModelKeyGrantedRoleArrayMap } from '../collection';
import { DocumentSnapshot } from '../types';
import { snapshotConverterFunctions } from './snapshot';
import { firestoreArrayMap, firestoreDate, firestoreEncodedArray, firestoreEnum, firestoreField, firestoreMap, firestoreModelKeyGrantedRoleArrayMap, firestoreEnumArray, firestoreUniqueKeyedArray, firestoreUniqueStringArray } from './snapshot.field';

describe('firestoreField()', () => {
  const defaultValue = -1;
  const fromDataValue = 1;
  const toDataValue = 0;

  const fromData = () => fromDataValue;
  const toData = () => toDataValue;

  const config = {
    default: defaultValue,
    fromData,
    toData
  };

  it('should return the conversion config', () => {
    const result = firestoreField(config);

    expect(result.from!.convert).toBe(fromData);
    expect(result.to!.convert).toBe(toData);
  });

  describe('conversion', () => {
    const { from, to } = modelFieldMapFunctions(firestoreField(config));

    describe('from', () => {
      it('should return the default value when null/undefined is provided.', () => {
        expect(from(null)).toBe(defaultValue);
        expect(from(undefined)).toBe(defaultValue);
      });

      it('should return the converted value when a non-null is provided.', () => {
        expect(from(100)).toBe(fromDataValue);
      });
    });

    describe('to', () => {
      it('should return null when null/undefined is provided.', () => {
        expect(to(null)).toBe(null);
        expect(to(undefined)).toBe(null);
      });

      it('should return the converted value when a non-null is provided.', () => {
        expect(to(100)).toBe(toDataValue);
      });
    });
  });
});

export interface TestSnapshotDefaults {
  date: Date;
  uniqueStringArray: string[];
}

export const testSnapshotDefaultsConverter = snapshotConverterFunctions<TestSnapshotDefaults>({
  fields: {
    date: firestoreDate({ saveDefaultAsNow: true }),
    uniqueStringArray: firestoreUniqueStringArray()
  }
});

export function testSnapshotDefaultsSnapshotData(data: Partial<TestSnapshotDefaults>) {
  return {
    id: '0',
    ref: {
      id: '0'
    } as any,
    data: asGetter(data)
  } as DocumentSnapshot<TestSnapshotDefaults>;
}

describe('firestoreDate()', () => {
  const dateField = firestoreDate()!;

  it('should convert data from a date string to a Date.', () => {
    const dateString: ISO8601DateString = '2021-08-16T05:00:00.000Z';
    const value = new Date(dateString);

    const converted = dateField.from!.convert!(dateString);
    expect(converted).toBeDefined();
    expect(converted?.getTime()).toBe(value.getTime());
    expect(isValid(converted)).toBe(true);
  });

  it('should convert data from a date to a date string.', () => {
    const dateString = '2021-08-16T05:00:00.000Z';
    const value = new Date(dateString);

    const converted = dateField.to!.convert!(value);
    expect(converted).toBeDefined();
    expect(converted).toBe(dateString);
  });
});

type TestFirestoreEnumType = 'a' | 'b' | 'c';

describe('firestoreEnum()', () => {
  const enumField = firestoreEnum<TestFirestoreEnumType>({ default: 'a' });

  it('should return the default value if the input is not defined.', () => {
    const { from, to } = modelFieldMapFunctions(enumField);

    const result = from(undefined);

    expect(result).toBe('a');
  });

  it('should pass the enum values through.', () => {
    const { from, to } = modelFieldMapFunctions(enumField);

    const result = from('a');

    expect(result).toBe('a');
  });
});

interface TestUniqueItem {
  key: string;
}

describe('firestoreUniqueKeyedArray()', () => {
  const uniqueKeyedArrayConfig = firestoreUniqueKeyedArray<TestUniqueItem>({
    readKey: (x) => x.key
  });

  it('should filter out duplicate keyed data.', () => {
    const data = [{ key: 'a' }, { key: 'a' }, { key: 'b' }];

    const results = uniqueKeyedArrayConfig.from.convert(data);
    expect(results.length).toBe(2);
  });
});

describe('firestoreEnumArray()', () => {
  const firestoreEnumArrayConfig = firestoreEnumArray<TestFirestoreEnumType>();

  it('should filter out duplicate keyed data.', () => {
    const data: TestFirestoreEnumType[] = ['a', 'b', 'b'];

    const results = firestoreEnumArrayConfig.from.convert(data);
    expect(results.length).toBe(2);
  });

  it('should return an empty array when converting to data.', () => {
    const { from, to } = modelFieldMapFunctions(firestoreEnumArrayConfig);

    const result = from(undefined);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

describe('firestoreUniqueStringArray()', () => {
  const uniqueStringArrayConfig = firestoreUniqueStringArray({
    toLowercase: true
  });

  it('should filter and transform the data.', () => {
    const data = ['a', 'b', 'c', 'd'];

    const results = uniqueStringArrayConfig.from.convert([...data, ...data]);
    expect(results.length).toBe(data.length);
  });

  it('from should convert null to the default empty array', () => {
    const result = testSnapshotDefaultsConverter.from(testSnapshotDefaultsSnapshotData({}));

    expect(Array.isArray(result.uniqueStringArray)).toBe(true);
  });
});

describe('firestoreEncodedArray()', () => {
  const encodedArrayConfig = firestoreEncodedArray<TestUniqueItem, string>({
    convert: {
      toData: (model: TestUniqueItem) => model.key,
      fromData: (data: string) => ({ key: data })
    }
  });

  it('should convert to an encoded form for each value.', () => {
    const models = [{ key: 'a' }, { key: 'b' }];

    const results = encodedArrayConfig.to.convert(models) as string[];
    expect(results.length).toBe(models.length);
    expect(results[0]).toBe(models[0].key);
  });

  it('should convert to a deencoded form for each value.', () => {
    const data = ['a', 'b'];

    const results = encodedArrayConfig.from.convert(data);
    expect(results.length).toBe(data.length);
    expect(results[0].key).toBe(data[0]);
  });
});

describe('firestoreMap()', () => {
  const firestoreMapConfig = firestoreMap<Maybe<number>, string>();

  it('should filter out empty values from the final map.', () => {
    const test = {
      hasValue: 0,
      isEmpty: null
    };

    const results = firestoreMapConfig.to.convert(test) as Partial<typeof test>;

    expect(results).toBeDefined();
    expect(results.hasValue).toBe(test.hasValue);
    expect(objectHasKey(results, 'hasValue')).toBe(true);
    expect(objectHasKey(results, 'isEmpty')).toBe(false);
  });
});

describe('firestoreArrayMap()', () => {
  const firestoreArrayMapConfig = firestoreArrayMap<number, string>();

  it('should filter out empty arrays from the final map.', () => {
    const test = {
      hasValue: [0],
      isEmpty: []
    };

    const results = firestoreArrayMapConfig.to.convert(test) as Partial<typeof test>;

    expect(results).toBeDefined();
    expect(results.hasValue).toContain(test.hasValue[0]);
    expect(objectHasKey(results, 'hasValue')).toBe(true);
    expect(objectHasKey(results, 'isEmpty')).toBe(false);
  });
});

describe('firestoreModelKeyGrantedRoleArrayMap()', () => {
  const firestoreArrayMapConfig = firestoreModelKeyGrantedRoleArrayMap();

  it('should filter out empty arrays from the final map.', () => {
    const test: FirestoreModelKeyGrantedRoleArrayMap<string> = {
      amodelpath: ['true', ''],
      emptymodelpath: []
    };

    const results = firestoreArrayMapConfig.to.convert(test) as Partial<typeof test>;

    expect(results).toBeDefined();
    expect(results.amodelpath).toContain('true');
    expect(results.amodelpath).not.toContain('');
    expect(objectHasKey(results, 'amodelpath')).toBe(true);
    expect(objectHasKey(results, 'emptymodelpath')).toBe(false);
  });
});
