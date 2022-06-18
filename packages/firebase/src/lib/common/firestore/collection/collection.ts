import { CollectionReferenceRef, FirestoreContextReference, QueryLikeReferenceRef } from '../reference';
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
import { Building, ModelKey, ModelTypeString } from '@dereekb/util';

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

export type FirestoreModelIdentityType = 'root' | 'nested';

/**
 * A firestore model's identity
 */
export type FirestoreModelIdentity<M extends FirestoreModelType = FirestoreModelType, C extends FirestoreCollectionName = FirestoreCollectionName> = FirestoreModelTypeRef<M> & {
  readonly type: FirestoreModelIdentityType;
  readonly collection: C;
  /**
   * @deprecated use modelType instead.
   */
  readonly model: M; // NOTE: Remove later on.
};

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
export function firestoreModelIdentity<P extends FirestoreModelIdentity<string, string>, M extends FirestoreModelType, C extends FirestoreCollectionName = FirestoreCollectionName>(parentOrModelName: P | M, collectionNameOrModelName?: M | C, collectionName?: C): FirestoreModelIdentityWithParent<P, M, C> | RootFirestoreModelIdentity<M, C> {
  if (typeof parentOrModelName === 'object') {
    return {
      type: 'nested',
      parent: parentOrModelName as P,
      collection: (collectionName as C) ?? ((collectionNameOrModelName as M).toLowerCase() as C),
      model: collectionNameOrModelName as M,
      modelType: collectionNameOrModelName as M
    };
  } else {
    return {
      type: 'root',
      collection: (collectionNameOrModelName as C) ?? (parentOrModelName.toLowerCase() as C),
      model: parentOrModelName,
      modelType: parentOrModelName
    };
  }
}

/**
 * Reference to a FirestoreCollectionName
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
export interface FirestoreCollectionNameRef {
  /**
   * Returns the FirestoreCollectionName for this context.
   */
  readonly collectionName: FirestoreCollectionName;
}

/**
 * Reference to a FirestoreModelIdentity
 */
export interface FirestoreModelIdentityRef<M extends FirestoreModelType = FirestoreModelType> {
  /**
   * Returns the FirestoreModelIdentity for this context.
   */
  readonly modelIdentity: FirestoreModelIdentity<M>;
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
export type FirestoreIdentityModelKey<I extends RootFirestoreModelIdentity, K extends FirestoreModelId = FirestoreModelId> = I extends RootFirestoreModelIdentity<infer M, infer C> ? `${C}/${K}` : never;

/**
 * Creates a firestoreModelKey for root identities.
 *
 * @param identity
 * @param id
 * @returns
 */
export function firestoreModelKey<I extends RootFirestoreModelIdentity, K extends FirestoreModelId = FirestoreModelId>(identity: I, id: K): FirestoreIdentityModelKey<I, K> {
  return `${identity.collection}/${id}` as FirestoreIdentityModelKey<I, K>;
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

  const { collection, firestoreContext, firestoreAccessorDriver } = config;
  (config as unknown as Building<QueryLikeReferenceRef<T>>).queryLike = collection;

  const firestoreIteration: FirestoreItemPageIterationFactoryFunction<T> = firestoreItemPageIterationFactory(config);
  const documentAccessor: FirestoreDocumentAccessorFactoryFunction<T, D> = firestoreDocumentAccessorFactory(config);
  const queryFactory: FirestoreQueryFactory<T> = firestoreQueryFactory(config);

  const documentAccessorExtension = firestoreDocumentAccessorContextExtension({ documentAccessor, firestoreAccessorDriver });
  const { queryDocument } = firestoreCollectionQueryFactory(queryFactory, documentAccessorExtension);
  const { query } = queryFactory;

  return {
    config,
    collection,
    queryLike: collection,
    firestoreContext,
    ...documentAccessorExtension,
    firestoreIteration,
    query,
    queryDocument
  };
}

// MARK: Compat

/**
 * Alternative name for FirestoreModelType.
 */
export type FirestoreModelName = FirestoreModelType;

/**
 * @deprecated replaced by FirestoreModelTypeRef
 */
export type FirestoreModelNameRef<M extends FirestoreModelType = FirestoreModelType> = FirestoreModelTypeRef<M>;

export type FirestoreModelNames<I extends FirestoreModelIdentity> = FirestoreModelTypes<I>;
