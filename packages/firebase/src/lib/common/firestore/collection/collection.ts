import { CollectionReferenceRef, DocumentReferenceRef, FirestoreContextReference, QueryLikeReferenceRef } from '../reference';
import {
  FirestoreDocument,
  FirestoreDocumentAccessorFactory,
  FirestoreDocumentAccessorFactoryFunction,
  FirestoreDocumentAccessorFactoryConfig,
  firestoreDocumentAccessorFactory,
  FirestoreDocumentAccessorForTransactionFactory,
  FirestoreDocumentAccessorForWriteBatchFactory,
  firestoreDocumentAccessorContextExtension,
  LimitedFirestoreDocumentAccessorFactory,
  LimitedFirestoreDocumentAccessorForTransactionFactory,
  LimitedFirestoreDocumentAccessorForWriteBatchFactory,
  LimitedFirestoreDocumentAccessor,
  FirestoreDocumentAccessor
} from '../accessor/document';
import { FirestoreItemPageIterationBaseConfig, FirestoreItemPageIterationFactory, firestoreItemPageIterationFactory, FirestoreItemPageIterationFactoryFunction } from '../query/iterator';
import { firestoreQueryFactory, FirestoreQueryFactory } from '../query/query';
import { FirestoreDrivers } from '../driver/driver';
import { FirestoreCollectionQueryFactory, firestoreCollectionQueryFactory } from './collection.query';
import { ArrayOrValue, arrayToObject, Building, forEachInIterable, isOddNumber, lastValue, Maybe, ModelKey, ModelTypeString, takeFront } from '@dereekb/util';

/**
 * The camelCase model name/type.
 */
export type FirestoreModelType = ModelTypeString;

/**
 * An all lowercase name that references a collection. Is usually the lowercase version of the FirestoreModelType.
 *
 * This is the part of the path that says what the collection is.
 *
 * Each collection name in the app should be unique, as usage of CollectionGroups would cause collections with the same name to be returned.
 */
export type FirestoreCollectionName = string;

export const FIRESTORE_COLLECTION_NAME_SEPARATOR = '/';

/**
 * Unique identifier for a nested collection type. Is the combination of all FirestoreCollectionNames of all parents.
 *
 * Example: parent/parentb/collectionname
 */
export type FirestoreCollectionType = ModelTypeString;

/**
 * Reference to a FirestoreCollectionType
 */
export interface FirestoreCollectionTypeRef {
  readonly collectionType: FirestoreCollectionType;
}

export type FirestoreModelIdentityType = 'root' | 'nested';

/**
 * A firestore model's identity
 */
export type FirestoreModelIdentity<M extends FirestoreModelType = FirestoreModelType, C extends FirestoreCollectionName = FirestoreCollectionName> = FirestoreModelTypeRef<M> &
  FirestoreCollectionNameRef<C> &
  FirestoreCollectionTypeRef & {
    readonly type: FirestoreModelIdentityType;
  };

export type FirestoreModelIdentityModelType<I> = I extends FirestoreModelIdentity<infer M> ? M : never;
export type FirestoreModelIdentityCollectionName<I> = I extends FirestoreModelIdentity<infer M, infer C> ? C : never;

/**
 * A root-level FirestoreModelIdentity
 */
export type RootFirestoreModelIdentity<M extends FirestoreModelType = FirestoreModelType, C extends FirestoreCollectionName = FirestoreCollectionName> = FirestoreModelIdentity<M, C> & {
  readonly type: 'root';
};

/**
 * A nested FirestoreModelIdentity with a parent.
 */
export type FirestoreModelIdentityWithParent<P extends FirestoreModelIdentity<string, string>, M extends FirestoreModelType = FirestoreModelType, C extends FirestoreCollectionName = FirestoreCollectionName> = FirestoreModelIdentity<M, C> & {
  readonly type: 'nested';
  readonly parent: P;
};

/**
 * A default collection name derived from the model name.
 */
export type FirestoreModelDefaultCollectionName<M extends FirestoreModelType> = `${Lowercase<M>}`;

export type FirestoreModelTypes<I extends FirestoreModelIdentity> = I extends FirestoreModelIdentity<infer M> ? M : never;

/**
 * Creates a FirestoreModelIdentity value.
 *
 * @param modelName
 * @returns
 */
export function firestoreModelIdentity<M extends FirestoreModelType>(modelName: M): RootFirestoreModelIdentity<M, FirestoreModelDefaultCollectionName<M>>;
export function firestoreModelIdentity<P extends FirestoreModelIdentity<string, string>, M extends FirestoreModelType>(parent: P, modelName: M): FirestoreModelIdentityWithParent<P, M, FirestoreModelDefaultCollectionName<M>>;
export function firestoreModelIdentity<M extends FirestoreModelType, C extends FirestoreCollectionName = FirestoreCollectionName>(modelName: M, collectionName: C): RootFirestoreModelIdentity<M, C>;
export function firestoreModelIdentity<P extends FirestoreModelIdentity<string, string>, M extends FirestoreModelType, C extends FirestoreCollectionName = FirestoreCollectionName>(parent: P, modelName: M, collectionName: C): FirestoreModelIdentityWithParent<P, M, C>;
export function firestoreModelIdentity<P extends FirestoreModelIdentity<string, string>, M extends FirestoreModelType, C extends FirestoreCollectionName = FirestoreCollectionName>(parentOrModelName: P | M, collectionNameOrModelName?: M | C, inputCollectionName?: C): FirestoreModelIdentityWithParent<P, M, C> | RootFirestoreModelIdentity<M, C> {
  if (typeof parentOrModelName === 'object') {
    const collectionName = (inputCollectionName as C) ?? ((collectionNameOrModelName as M).toLowerCase() as C);
    const collectionType = `${parentOrModelName.collectionType}/${collectionName}`;
    return {
      type: 'nested',
      parent: parentOrModelName as P,
      collectionName,
      modelType: collectionNameOrModelName as M,
      collectionType
    };
  } else {
    const collectionName = (collectionNameOrModelName as C) ?? (parentOrModelName.toLowerCase() as C);
    const collectionType = collectionName;
    return {
      type: 'root',
      collectionName,
      modelType: parentOrModelName,
      collectionType
    };
  }
}

/**
 * Map that maps FirestoreModelIdentity value's FirestoreModelType, FirestoreCollectionName, and FirestoreCollectionType value to the FirestoreModelType.
 */
export type FirestoreModelIdentityTypeMap = Map<FirestoreModelType | FirestoreCollectionName | FirestoreCollectionType, FirestoreModelType>;

/**
 * Creates a FirestoreModelIdentityTypeMap from the input identities.
 * @param identities
 * @returns
 */
export function firestoreModelIdentityTypeMap(identities: Iterable<FirestoreModelIdentity>): FirestoreModelIdentityTypeMap {
  const map = new Map<FirestoreModelType | FirestoreCollectionName, FirestoreModelType>();

  forEachInIterable(identities, (x) => {
    const { modelType, collectionName, collectionType } = x;

    map.set(modelType, modelType);
    map.set(collectionType, modelType);
    map.set(collectionName, modelType);
  });

  return map;
}

/**
 * Reference to a FirestoreModelType
 */
export interface FirestoreModelTypeRef<M extends FirestoreModelType = FirestoreModelType> {
  /**
   * Returns the FirestoreModelType for this context.
   */
  readonly modelType: M;
}

/**
 * Reads the FirestoreModelType from a FirestoreModelType or FirestoreModelTypeRef.
 *
 * @param modelTypeInput
 * @returns
 */
export function firestoreModelType(modelTypeInput: FirestoreModelType | FirestoreModelTypeRef): FirestoreModelType {
  const modelType = typeof modelTypeInput === 'string' ? modelTypeInput : modelTypeInput.modelType;

  if (!modelType) {
    throw new Error('modelType is required.');
  }

  return modelType;
}

/**
 * Reference to a FirestoreCollectionName
 */
export interface FirestoreCollectionNameRef<C extends FirestoreCollectionName = FirestoreCollectionName> {
  /**
   * Returns the FirestoreCollectionName for this context.
   */
  readonly collectionName: C;
}

/**
 * Reference to a FirestoreModelIdentity via the FirestoreModelType and FirestoreCollectionName
 */
export interface FirestoreModelTypeModelIdentityRef<M extends FirestoreModelType = FirestoreModelType, C extends FirestoreCollectionName = FirestoreCollectionName> {
  /**
   * Returns the FirestoreModelIdentity for this context.
   */
  readonly modelIdentity: FirestoreModelIdentity<M, C>;
}

/**
 * Reference to a FirestoreModelIdentity
 */
export interface FirestoreModelIdentityRef<I extends FirestoreModelIdentity = FirestoreModelIdentity> {
  /**
   * Returns the FirestoreModelIdentity for this context.
   */
  readonly modelIdentity: I;
}

// MARK: Path
/**
 * The model's id within a collection.
 *
 * Different from the FirestoreModelKey, which is the full path in the databse.
 *
 * Example:
 *
 * 12345
 */
export type FirestoreModelId = string;

/**
 * Reads a firestoreModelId from the input.
 *
 * @param input
 * @returns
 */
export function firestoreModelId(input: FirestoreModelId | FirestoreModelKey | DocumentReferenceRef<unknown> | FirestoreModelKeyRef | FirestoreModelIdRef): FirestoreModelId {
  let key = '';
  let id;

  if (typeof input === 'object') {
    if ((input as FirestoreModelIdRef).id) {
      id = (input as FirestoreModelIdRef).id;
    } else if ((input as FirestoreModelKeyRef).key) {
      key = (input as FirestoreModelKeyRef).key;
    } else if ((input as DocumentReferenceRef<unknown>).documentRef != null) {
      id = (input as DocumentReferenceRef<unknown>).documentRef.id;
    }
  } else {
    key = input;
  }

  if (id) {
    return id;
  } else {
    return lastValue(key.split(FIRESTORE_COLLECTION_NAME_SEPARATOR));
  }
}

/**
 * Returns the array of ids within a FirestoreModelKey.
 *
 * @param input
 * @returns
 */
export function firestoreModelIdsFromKey(input: FirestoreModelKey | DocumentReferenceRef<unknown> | FirestoreModelKeyRef): FirestoreModelId[] {
  const parts = firestoreModelKeyPartPairs(input);
  return parts?.map((x) => x.id) ?? [];
}

/**
 * A FirestoreModelKey that has been "flat" to a FirestoreModelId.
 *
 * This is useful in cases where another object's is is derivative from a FirestoreModelKey.
 *
 * All slashes are removed from the object in order to make it a valid FirestoreModelId.
 */
export type FlatFirestoreModelKey = FirestoreModelId;

/**
 * A FlatFirestoreModelKey that is encoded in a "one-way" manner by removing all slashes.
 *
 * This is useful for cases where the original ModelKey does not need to be inferred from the flat key.
 */
export type OneWayFlatFirestoreModelKey = FlatFirestoreModelKey;

/**
 * Creates a OneWayFlatFirestoreModelKey from the input FirestoreModelKey.
 *
 * @param key
 * @returns
 */
export function flatFirestoreModelKey(key: FirestoreModelKey): OneWayFlatFirestoreModelKey {
  return key.replace(/\//g, '');
}

/**
 * A FlatFirestoreModelKey that is encoded in a "two-way" manner by replacing the slashes with underscores.
 *
 * This is useful for cases where the original ModelKey needs to be inferred from the flat key.
 */
export type TwoWayFlatFirestoreModelKey = FlatFirestoreModelKey;

/**
 * Creates a TwoWayFlatFirestoreModelKey from the input FirestoreModelKey.
 *
 * @param key
 * @returns
 */
export function twoWayFlatFirestoreModelKey(key: FirestoreModelKey): TwoWayFlatFirestoreModelKey {
  return key.replace(/\//g, '_');
}

/**
 * Creates a TwoWayFlatFirestoreModelKey from the input FirestoreModelKey.
 *
 * @param key
 * @returns
 */
export function inferKeyFromTwoWayFlatFirestoreModelKey(key: TwoWayFlatFirestoreModelKey): FirestoreModelKey {
  return key.replace(/\_/g, FIRESTORE_COLLECTION_NAME_SEPARATOR);
}

/**
 * Firestore Model Id Regex
 *
 * https://stackoverflow.com/questions/52850099/what-is-the-reg-expression-for-firestore-constraints-on-document-ids
 */
export const FIRESTORE_MODEL_ID_REGEX = /^(?!\.\.?$)(?!.*__.*__)([^\s/]{1,1500})$/;

/**
 * Returns true if the input string is a FirestoreModelId.
 *
 * @param input
 */
export function isFirestoreModelId(input: string | FirestoreModelId): input is FirestoreModelId {
  return FIRESTORE_MODEL_ID_REGEX.test(input);
}

/**
 * Reference to a FirestoreModelId
 */
export interface FirestoreModelIdRef {
  /**
   * Returns the FirestoreModelId for this context.
   */
  readonly id: FirestoreModelId;
}

/**
 * The full path for a model in the Firestore database.
 *
 * Example:
 *
 * collection/12345/subcollection/67890
 */
export type FirestoreModelKey = ModelKey;

/**
 * FirestoreModelKey and FirestoreCollectionType ref
 */
export type FirestoreModelKeyCollectionTypePair = FirestoreModelKeyRef & FirestoreCollectionTypeRef;

export function firestoreModelKeyPair() {}

/**
 * Firestore Model Key Regex that checks for pairs.
 */
export const FIRESTORE_MODEL_KEY_REGEX = /^(?:([^\s/]+)\/([^\s/]+))(?:\/(?:([^\s/]+))\/(?:([^\s/]+)))*$/;

/**
 * Firestore Model Key Regex that is more strict
 */
export const FIRESTORE_MODEL_KEY_REGEX_STRICT = /^(?:(?:(?!\.\.?$)(?!.*__.*__)([^\s/]+))\/(?:(?!\.\.?$)(?!.*__.*__)([^\s/]+))\/?)(?:\/(?:(?!\.\.?$)(?!.*__.*__)([^\s/]+))\/(?:(?!\.\.?$)(?!.*__.*__)([^\s/]+)))*$/;

/**
 * Returns true if the input string is a FirestoreModelKey.
 *
 * @param input
 */
export function isFirestoreModelKey(input: string | FirestoreModelKey): input is FirestoreModelKey {
  return FIRESTORE_MODEL_KEY_REGEX.test(input);
}

/**
 * A part of a FirestoreModelKey.
 */
export type FirestoreModelKeyPart<C extends FirestoreCollectionName = FirestoreCollectionName, K extends FirestoreModelId = FirestoreModelId> = `${C}/${K}`;

/**
 * One part of a FirestoreModelKe
 */
export type FirestoreCollectionModelKeyPart<N extends FirestoreCollectionNameRef = FirestoreCollectionNameRef, K extends FirestoreModelId = FirestoreModelId> = N extends FirestoreCollectionNameRef<infer C> ? FirestoreModelKeyPart<C, K> : never;
export type FirestoreCollectionModelKey<N extends FirestoreCollectionNameRef = FirestoreCollectionNameRef, K extends FirestoreModelId = FirestoreModelId> = FirestoreCollectionModelKeyPart<N, K>;

/**
 * Creates a firestoreModelKeyPart
 *
 * @param identity
 * @param id
 * @returns
 */
export function firestoreModelKeyPart<N extends FirestoreCollectionNameRef, K extends FirestoreModelId = FirestoreModelId>(identity: N, id: K): FirestoreCollectionModelKeyPart<N, K> {
  return `${identity.collectionName}/${id}` as FirestoreCollectionModelKeyPart<N, K>;
}

/**
 * Creates a firestoreModelKey for RootFirestoreModelIdentity values.
 *
 * @param identity
 * @param id
 * @returns
 */
export const firestoreModelKey = firestoreModelKeyPart as <I extends RootFirestoreModelIdentity, K extends FirestoreModelId = FirestoreModelId>(identity: I, id: K) => FirestoreCollectionModelKey<I, K>;

/**
 * Creates an array of FirestoreCollectionModelKey values from the input ids.
 *
 * @param identity
 * @param ids
 * @returns
 */
export function firestoreModelKeys<I extends RootFirestoreModelIdentity, K extends FirestoreModelId = FirestoreModelId>(identity: I, ids: K[]): FirestoreCollectionModelKey<I, K>[] {
  return ids.map((x) => firestoreModelKey(identity, x));
}

/**
 * Joins together a number of FirestoreModelKeyPart values.
 *
 * @param parts
 * @returns
 */
export function firestoreModelKeyPath(...parts: FirestoreModelKeyPart[]): FirestoreModelKey {
  return parts.join(FIRESTORE_COLLECTION_NAME_SEPARATOR);
}

/**
 * Creates a number of child paths from the parent path.
 *
 * @param parent
 * @param children
 * @returns
 */
export function childFirestoreModelKeyPath(parent: FirestoreModelKeyPart, children: ArrayOrValue<FirestoreModelKeyPart>): FirestoreModelKey[] {
  if (Array.isArray(children)) {
    return children.map((childPath) => `${parent}/${childPath}`);
  } else {
    return [`${parent}/${children}`];
  }
}

export type FirestoreModelCollectionAndIdPairObject = Record<FirestoreCollectionName, FirestoreModelId>;

export function firestoreModelKeyPairObject(input: FirestoreModelKey | DocumentReferenceRef<unknown> | FirestoreModelKeyRef): Maybe<FirestoreModelCollectionAndIdPairObject> {
  const pairs = firestoreModelKeyPartPairs(input);
  let object: Maybe<FirestoreModelCollectionAndIdPairObject>;

  if (pairs) {
    object = arrayToObject(
      pairs,
      (x) => x.collectionName,
      (x) => x.id
    );
  }

  return object;
}

export type FirestoreModelCollectionTypeArrayName = string;

export function firestoreModelKeyCollectionType<T = unknown>(input: ReadFirestoreModelKeyInput<T>) {
  return firestoreModelKeyCollectionTypeArrayName(input, FIRESTORE_COLLECTION_NAME_SEPARATOR);
}

export function firestoreModelKeyCollectionTypeArrayName<T = unknown>(input: ReadFirestoreModelKeyInput<T>, separator: string = FIRESTORE_COLLECTION_NAME_SEPARATOR): Maybe<FirestoreModelCollectionTypeArrayName> {
  return firestoreModelKeyCollectionTypeArray(input)?.join(separator);
}

export function firestoreIdentityTypeArrayName(input: FirestoreModelIdentity, separator: string = FIRESTORE_COLLECTION_NAME_SEPARATOR): FirestoreModelCollectionTypeArrayName {
  return firestoreIdentityTypeArray(input).join(separator);
}

export type FirestoreModelCollectionTypeArray = FirestoreCollectionName[];

export function firestoreIdentityTypeArray(input: FirestoreModelIdentity): FirestoreModelCollectionTypeArray {
  const array: FirestoreCollectionName[] = [];

  let current = input;

  while (true) {
    array.push(current.collectionName);

    if (current.type === 'nested') {
      current = (current as FirestoreModelIdentityWithParent<any>).parent as FirestoreModelIdentity;
    } else {
      break;
    }
  }

  return array.reverse();
}

export function firestoreModelKeyCollectionTypeArray<T = unknown>(input: ReadFirestoreModelKeyInput<T>): Maybe<FirestoreModelCollectionTypeArray> {
  const key = readFirestoreModelKey<T>(input);
  let array: Maybe<FirestoreCollectionName[]>;

  if (key) {
    const pieces = key?.split(FIRESTORE_COLLECTION_NAME_SEPARATOR);

    if (isOddNumber(pieces.length)) {
      throw new Error('input key source was a collection ref or unavailable.');
    }

    array = [];

    for (let i = 0; i < pieces.length; i += 2) {
      const collectionName = pieces[i];
      array.push(collectionName);
    }
  }

  return array;
}

export interface FirestoreModelCollectionAndIdPair extends FirestoreModelIdRef, FirestoreCollectionNameRef {}

/**
 * Returns the collection name of the input key.
 *
 * @param input
 * @returns
 */
export function firestoreModelKeyCollectionName<T = unknown>(input: ReadFirestoreModelKeyInput<T>): Maybe<FirestoreCollectionName> {
  return firestoreModelKeyTypePair(input)?.collectionName;
}

/**
 * Returns the parent model key from up the specified amount of levels.
 *
 * @param input
 * @param maxLevelsUp
 */
export function firestoreModelKeyParentKey<T = unknown>(input: ReadFirestoreModelKeyInput<T>, maxLevelsUp = 1): Maybe<FirestoreModelKey> {
  const keyParts = firestoreModelKeyParentKeyPartPairs(input, maxLevelsUp);
  let result: Maybe<FirestoreModelKey>;

  if (keyParts) {
    result = firestoreModelKeyPartPairsKeyPath(keyParts);
  }

  return result;
}

export function firestoreModelKeyParentKeyPartPairs<T = unknown>(input: ReadFirestoreModelKeyInput<T>, maxLevelsUp = 1): Maybe<FirestoreModelCollectionAndIdPair[]> {
  const allParts = firestoreModelKeyPartPairs(input);
  let parentParts: Maybe<FirestoreModelCollectionAndIdPair[]> = undefined;

  if (allParts) {
    const numberOfParts = Math.max(1, allParts.length - maxLevelsUp);
    parentParts = takeFront(allParts, numberOfParts);
  }

  return parentParts;
}

/**
 * Returns the last pair type from all generated pairs from the input.
 *
 * @param input
 * @returns
 */
export function firestoreModelKeyTypePair<T = unknown>(input: ReadFirestoreModelKeyInput<T>): Maybe<FirestoreModelCollectionAndIdPair> {
  return lastValue(firestoreModelKeyPartPairs(input));
}

export function firestoreModelKeyPartPairs<T = unknown>(input: ReadFirestoreModelKeyInput<T>): Maybe<FirestoreModelCollectionAndIdPair[]> {
  const key = readFirestoreModelKey<T>(input);
  let pairs: Maybe<FirestoreModelCollectionAndIdPair[]>;

  if (key) {
    const pieces = key?.split(FIRESTORE_COLLECTION_NAME_SEPARATOR);

    if (isOddNumber(pieces.length)) {
      throw new Error('input key source was a collection ref or unavailable.');
    }

    pairs = [];

    for (let i = 0; i < pieces.length; i += 2) {
      const collectionName = pieces[i];
      const id = pieces[i + 1];
      pairs.push({ id, collectionName });
    }
  }

  return pairs;
}

/**
 * Creates a FirestoreModelKey from the input pairs.
 *
 * @param input
 * @returns
 */
export function firestoreModelKeyPartPairsKeyPath(input: FirestoreModelCollectionAndIdPair[]): FirestoreModelKey {
  return firestoreModelKeyPath(...firestoreModelKeyPartPairsPaths(input));
}

/**
 * Maps the input FirestoreModelCollectionAndIdPair[] values to FirestoreModelKeyPart[] values.
 *
 * @param input
 * @returns
 */
export function firestoreModelKeyPartPairsPaths(input: FirestoreModelCollectionAndIdPair[]): FirestoreModelKeyPart[] {
  return input.map((x) => `${x.collectionName}/${x.id}`) as FirestoreModelKeyPart[];
}

export type ReadFirestoreModelKeyInput<T = unknown> = FirestoreModelKey | FirestoreModelKeyRef | DocumentReferenceRef<T>;

export function readFirestoreModelKey<T = unknown>(input: ReadFirestoreModelKeyInput<T>, required: true): FirestoreModelKey;
export function readFirestoreModelKey<T = unknown>(input: ReadFirestoreModelKeyInput<T>, required: false): Maybe<FirestoreModelKey>;
export function readFirestoreModelKey<T = unknown>(input: ReadFirestoreModelKeyInput<T>, required?: boolean): Maybe<FirestoreModelKey>;
export function readFirestoreModelKey<T = unknown>(input: ReadFirestoreModelKeyInput<T>, required = false): Maybe<FirestoreModelKey> {
  let key: Maybe<string>;

  if (typeof input === 'object') {
    if ((input as FirestoreModelKeyRef).key) {
      key = (input as FirestoreModelKeyRef).key;
    } else if ((input as DocumentReferenceRef<unknown>).documentRef != null) {
      key = (input as DocumentReferenceRef<unknown>).documentRef.path;
    }
  } else {
    key = input;
  }

  if (!key && required) {
    throw new Error('Key is required.');
  }

  return key;
}

export const FIRESTORE_DUMMY_MODEL_KEY = 'dummymodel/dummykey';

/**
 * Dummy value used to pass validations or other cases where a key is required but ultimately not used. Is not meant to reference a real model.
 */
export type FirestoreDummyModelKey = typeof FIRESTORE_DUMMY_MODEL_KEY;

/**
 * Returns the FirestoreDummyModelKey value.
 */
export function firestoreDummyKey(): FirestoreDummyModelKey {
  return FIRESTORE_DUMMY_MODEL_KEY;
}

/**
 * Reference to a FirestoreModelKey
 */
export interface FirestoreModelKeyRef {
  /**
   * Returns the FirestoreModelKey for this context.
   */
  readonly key: FirestoreModelKey;
}

// MARK: FirestoreCollectionLike
/**
 * Instance that provides several accessors for accessing documents of a collection.
 */
export interface FirestoreCollectionLike<T, D extends FirestoreDocument<T> = FirestoreDocument<T>, A extends LimitedFirestoreDocumentAccessor<T, D> = LimitedFirestoreDocumentAccessor<T, D>>
  extends FirestoreContextReference,
    FirestoreModelIdentityRef,
    QueryLikeReferenceRef<T>,
    FirestoreItemPageIterationFactory<T>,
    FirestoreQueryFactory<T>,
    LimitedFirestoreDocumentAccessorFactory<T, D, A>,
    LimitedFirestoreDocumentAccessorForTransactionFactory<T, D, A>,
    LimitedFirestoreDocumentAccessorForWriteBatchFactory<T, D, A>,
    FirestoreCollectionQueryFactory<T, D> {}

// MARK: FirestoreCollection
/**
 * FirestoreCollection configuration
 */
export interface FirestoreCollectionConfig<T, D extends FirestoreDocument<T> = FirestoreDocument<T>> extends FirestoreContextReference, FirestoreDrivers, Omit<FirestoreItemPageIterationBaseConfig<T>, 'queryLike'>, Partial<QueryLikeReferenceRef<T>>, FirestoreDocumentAccessorFactoryConfig<T, D> {}

/**
 * Instance that provides several accessors for accessing documents of a collection.
 *
 * Provides a full FirestoreDocumentAccessor instead of limited accessors.
 */
export interface FirestoreCollection<T, D extends FirestoreDocument<T> = FirestoreDocument<T>> extends FirestoreCollectionLike<T, D, FirestoreDocumentAccessor<T, D>>, CollectionReferenceRef<T>, FirestoreDocumentAccessorFactory<T, D>, FirestoreDocumentAccessorForTransactionFactory<T, D>, FirestoreDocumentAccessorForWriteBatchFactory<T, D> {
  readonly config: FirestoreCollectionConfig<T, D>;
}

/**
 * Ref to a FirestoreCollection
 */
export interface FirestoreCollectionRef<T, D extends FirestoreDocument<T> = FirestoreDocument<T>> {
  readonly firestoreCollection: FirestoreCollection<T, D>;
}

/**
 * Creates a new FirestoreCollection from the input config.
 */
export function makeFirestoreCollection<T, D extends FirestoreDocument<T>>(inputConfig: FirestoreCollectionConfig<T, D>): FirestoreCollection<T, D> {
  const config = inputConfig as FirestoreCollectionConfig<T, D> & QueryLikeReferenceRef<T>;

  const { modelIdentity, collection, firestoreContext, firestoreAccessorDriver } = config;
  (config as unknown as Building<QueryLikeReferenceRef<T>>).queryLike = collection;

  const firestoreIteration: FirestoreItemPageIterationFactoryFunction<T> = firestoreItemPageIterationFactory(config);
  const documentAccessor: FirestoreDocumentAccessorFactoryFunction<T, D> = firestoreDocumentAccessorFactory(config);
  const queryFactory: FirestoreQueryFactory<T> = firestoreQueryFactory(config);

  const documentAccessorExtension = firestoreDocumentAccessorContextExtension({ documentAccessor, firestoreAccessorDriver });
  const { queryDocument } = firestoreCollectionQueryFactory(queryFactory, documentAccessorExtension);
  const { query } = queryFactory;

  return {
    config,
    modelIdentity,
    collection,
    queryLike: collection,
    firestoreContext,
    ...documentAccessorExtension,
    firestoreIteration,
    query,
    queryDocument
  };
}
