import { type GetterOrValue, type PromiseOrValue, type IndexRef, type Maybe, asGetter, lastValue, type PerformAsyncTasksConfig, performAsyncTasks, batch, type IndexNumber, type PerformAsyncTasksResult, type FactoryWithRequiredInput, performTasksFromFactoryInParallelFunction, getValueFromGetter, type Milliseconds, mapIdentityFunction, type AllowValueOnceFilter, allowValueOnceFilter } from '@dereekb/util';
import { type FirestoreDocument, type LimitedFirestoreDocumentAccessor, firestoreDocumentSnapshotPairsLoaderInstance, type FirestoreDocumentSnapshotDataPairWithData } from '../accessor';
import { type QueryDocumentSnapshot, type QuerySnapshot, type DocumentSnapshot } from '../types';
import { type FirestoreQueryConstraint, startAfter, limit } from './constraint';
import { type FirestoreQueryFactory } from './query';
import { type FirestoreModelKey } from '../collection/collection';
import { readFirestoreModelKeyFromDocumentSnapshot } from './query.util';

// MARK: Iterate Snapshot Pairs
/**
 * Config for iterateFirestoreDocumentSnapshots().
 */
export interface IterateFirestoreDocumentSnapshotPairsConfig<T, R, D extends FirestoreDocument<T> = FirestoreDocument<T>> extends Omit<IterateFirestoreDocumentSnapshotsConfig<T, R>, 'iterateSnapshot'> {
  /**
   * Document accessor to retrieve the documents for the references.
   */
  readonly documentAccessor: LimitedFirestoreDocumentAccessor<T, D>;
  /**
   * The iterate function per each snapshot.
   */
  iterateSnapshotPair(snapshot: FirestoreDocumentSnapshotDataPairWithData<D>): Promise<R>;
}

/**
 * Iterates through the results of a Firestore query by each FirestoreDocumentSnapshotDataPairWithData.
 *
 * @param config
 * @returns
 */
export async function iterateFirestoreDocumentSnapshotPairs<T, R, D extends FirestoreDocument<T> = FirestoreDocument<T>>(config: IterateFirestoreDocumentSnapshotPairsConfig<T, R>): Promise<IterateFirestoreDocumentSnapshotCheckpointsResult> {
  const { iterateSnapshotPair, documentAccessor } = config;
  const loadPairForSnapshot = firestoreDocumentSnapshotPairsLoaderInstance<T, D>(documentAccessor as LimitedFirestoreDocumentAccessor<T, D>);

  return iterateFirestoreDocumentSnapshots({
    ...config,
    iterateSnapshot: async (snapshot) => {
      const pair = loadPairForSnapshot(snapshot);
      return iterateSnapshotPair(pair);
    }
  });
}

// MARK: Iterate Snapshots
/**
 * Config for iterateFirestoreDocumentSnapshots().
 */
export interface IterateFirestoreDocumentSnapshotsConfig<T, R> extends Omit<IterateFirestoreDocumentSnapshotBatchesConfig<T, IterateFirestoreDocumentSnapshotsResult<T, R>>, 'iterateSnapshotBatch' | 'maxParallelCheckpoints'> {
  /**
   * The iterate function per each snapshot individually
   */
  iterateSnapshot(snapshot: QueryDocumentSnapshot<T>): Promise<R>;
  /**
   * (Optional) Additional config for the snapshot's PerformAsyncTasks call. By default user the performTasksConfig value.
   */
  readonly snapshotsPerformTasksConfig?: Partial<PerformAsyncTasksConfig<QueryDocumentSnapshot<T>>>;
}

export type IterateFirestoreDocumentSnapshotsResult<T, R> = PerformAsyncTasksResult<QueryDocumentSnapshot<T>, R>;

/**
 * Iterates through the results of a Firestore query by each document snapshot by itself.
 *
 * @param config
 * @returns
 */
export async function iterateFirestoreDocumentSnapshots<T, R>(config: IterateFirestoreDocumentSnapshotsConfig<T, R>): Promise<IterateFirestoreDocumentSnapshotCheckpointsResult> {
  const { iterateSnapshot, performTasksConfig, snapshotsPerformTasksConfig } = config;
  return iterateFirestoreDocumentSnapshotBatches<T, IterateFirestoreDocumentSnapshotsResult<T, R>>({
    ...config,
    maxParallelCheckpoints: 1,
    iterateSnapshotBatch: async (docSnapshots) => {
      const performTasksResult = await performAsyncTasks(docSnapshots, iterateSnapshot, {
        sequential: true, // sequential by default
        ...(snapshotsPerformTasksConfig ?? { ...performTasksConfig, nonConcurrentTaskKeyFactory: undefined, beforeRetry: undefined }) // don't pass the nonConcurrentTaskKeyFactory
      });

      return performTasksResult;
    }
  });
}

// MARK: Iterate Snapshot Pair Batches
/**
 * Config for iterateFirestoreDocumentSnapshots().
 */
export interface IterateFirestoreDocumentSnapshotPairBatchesConfig<T, R, D extends FirestoreDocument<T> = FirestoreDocument<T>> extends Omit<IterateFirestoreDocumentSnapshotBatchesConfig<T, R>, 'iterateSnapshotBatch'> {
  /**
   * Document accessor to retrieve the documents for the references.
   */
  readonly documentAccessor: LimitedFirestoreDocumentAccessor<T, D>;
  /**
   * The iterate function per each snapshot batch.
   */
  iterateSnapshotPairsBatch(snapshotDataPairs: FirestoreDocumentSnapshotDataPairWithData<D>[], batchIndex: number): Promise<R>;
}

/**
 * Iterates through the results of a Firestore query by each FirestoreDocumentSnapshotDataPair.
 *
 * @param config
 * @returns
 */
export async function iterateFirestoreDocumentSnapshotPairBatches<T, R, D extends FirestoreDocument<T> = FirestoreDocument<T>>(config: IterateFirestoreDocumentSnapshotPairBatchesConfig<T, R>): Promise<IterateFirestoreDocumentSnapshotCheckpointsResult> {
  const { iterateSnapshotPairsBatch, documentAccessor } = config;
  const loadPairForSnapshot = firestoreDocumentSnapshotPairsLoaderInstance<T, D>(documentAccessor as LimitedFirestoreDocumentAccessor<T, D>);

  return iterateFirestoreDocumentSnapshotBatches({
    ...config,
    maxParallelCheckpoints: 1,
    iterateSnapshotBatch: async (snapshots, batchIndex) => {
      const pairs = snapshots.map(loadPairForSnapshot) as FirestoreDocumentSnapshotDataPairWithData<D>[];
      return iterateSnapshotPairsBatch(pairs, batchIndex);
    }
  });
}

// MARK: Iterate Snapshot Batches
/**
 * Single batch result from iterateFirestoreDocumentSnapshotBatches().
 *
 * Contains the batch index, the snapshots, and the final result for this batch.
 */
export interface IterateFirestoreDocumentSnapshotBatchesResult<T, R> extends IndexRef {
  /***
   * Batch index number
   */
  readonly i: IndexNumber;
  /**
   * Document snapshots in this batch.
   */
  readonly snapshots: QueryDocumentSnapshot<T>[];
  /**
   * Result for this batch.
   */
  readonly result: R;
}

/**
 * Config for iterateFirestoreDocumentSnapshots().
 */
export interface IterateFirestoreDocumentSnapshotBatchesConfig<T, R> extends Omit<IterateFirestoreDocumentSnapshotCheckpointsConfig<T, IterateFirestoreDocumentSnapshotBatchesResult<T, R>>, 'iterateCheckpoint'> {
  /**
   * Max number of documents per batch. Defaults to 25.
   *
   * If null is then all snapshots will be processed in a single batch.
   */
  readonly batchSize?: Maybe<number>;
  /**
   * Determines the custom batch size for the input.
   *
   * If the factory returns returned null then all snapshots will be processed in a single batch.
   */
  readonly batchSizeForSnapshots?: Maybe<FactoryWithRequiredInput<number | null, QueryDocumentSnapshot<T>[]>>;
  /**
   * The iterate function per each snapshot.
   *
   * The batch will have atleast one item in it.
   */
  iterateSnapshotBatch(snapshotBatch: QueryDocumentSnapshot<T>[], batchIndex: number): Promise<R>;
  /**
   * (Optional) additional config for the PerformAsyncTasks call.
   *
   * By default:
   * - retriesAllowed = 0
   * - throwError = true
   * - sequential = true
   */
  readonly performTasksConfig?: Partial<PerformAsyncTasksConfig<QueryDocumentSnapshot<T>[]>>;
}

/**
 * Default batch size for iterateFirestoreDocumentSnapshotBatches().
 *
 * 25 documents per batch.
 */
export const DEFAULT_ITERATE_FIRESTORE_DOCUMENT_SNAPSHOT_BATCHES_BATCH_SIZE = 25;

/**
 * Iterates through the results of a Firestore query by each document snapshot.
 *
 * @param config
 * @returns
 */
export async function iterateFirestoreDocumentSnapshotBatches<T, R>(config: IterateFirestoreDocumentSnapshotBatchesConfig<T, R>): Promise<IterateFirestoreDocumentSnapshotCheckpointsResult> {
  const { iterateSnapshotBatch, batchSizeForSnapshots: inputBatchSizeForSnapshots, performTasksConfig, batchSize: inputBatchSize } = config;
  const batchSize = inputBatchSize === null ? null : inputBatchSize ?? DEFAULT_ITERATE_FIRESTORE_DOCUMENT_SNAPSHOT_BATCHES_BATCH_SIZE;
  const batchSizeForSnapshots = inputBatchSizeForSnapshots ?? (() => batchSize);

  return iterateFirestoreDocumentSnapshotCheckpoints({
    ...config,
    iterateCheckpoint: async (docSnapshots) => {
      if (docSnapshots.length > 0) {
        const batchSizeForSnapshotsResult = await batchSizeForSnapshots(docSnapshots);
        const batches = batchSizeForSnapshotsResult === null ? [docSnapshots] : batch(docSnapshots, batchSizeForSnapshotsResult);
        let i = 0;

        const performTasksResult = await performAsyncTasks(batches, (x) => iterateSnapshotBatch(x, i++), {
          sequential: true, // sequential by default
          ...performTasksConfig
        });

        return performTasksResult.results.map(([snapshots, result], i) => ({ snapshots, result, i }));
      } else {
        return [];
      }
    }
  });
}

// MARK: Iterate Checkpoints
/**
 * Config for iterateFirestoreDocumentSnapshotCheckpoints().
 */
export interface IterateFirestoreDocumentSnapshotCheckpointsConfig<T, R> {
  readonly queryFactory: FirestoreQueryFactory<T>;
  readonly constraintsFactory: GetterOrValue<FirestoreQueryConstraint[]>;
  /**
   * Whether or not to call the constraints factory each time.
   *
   * If the constraintsFactory is a getter then this defaults to true. If constraintsFactory is a value then this is set to false.
   */
  readonly dynamicConstraints?: boolean;
  /**
   * Convenience paramenter to add a maximum limit constraint to the query.
   *
   * The actual limit passed to the query will be calculated between this value, the totalSnapshotsLimit value, and the remaining number of snapshots to load.
   *
   * A limit of 0 is NOT considered as unlimited and will cause the function to end immediately.
   */
  readonly limitPerCheckpoint?: Maybe<number>;
  /**
   * The total number of snapshots allowed.
   *
   * Ends on the checkpoint that reaches this limit.
   */
  readonly totalSnapshotsLimit?: Maybe<number>;
  /**
   * The number of max parallel checkpoints to run.
   *
   * By default checkpoints are run serially (max of 1), but can be run in parallel.
   */
  readonly maxParallelCheckpoints?: number;
  /**
   * The amount of time to add as a delay between beginning a new checkpoint.
   *
   * If in parallel this is the minimum amount of time to wait before starting a new checkpoint.
   */
  readonly waitBetweenCheckpoints?: Milliseconds;
  /**
   * Configuration to use when a repeat cursor is visited (potentially indicative of an infinite query loop).
   *
   * Can be configured with false to exit the iteration immediately and return, or can use a function to decide if the iteration should continue.
   *
   * If false is returned the cursor is discarded and the loop will end.
   */
  readonly handleRepeatCursor?: Maybe<false | ((cursor: QueryDocumentSnapshot<T>) => Promise<boolean>)>;
  /**
   * Filter function that can be used to filter out snapshots.
   *
   * If all snapshots are filtered out the the iteration will continue with final item of the snapshot regardless of filtering. The filtering does not impact the continuation decision.
   * Use the handleRepeatCursor to properly exit the loop in unwanted repeat cursor cases.
   *
   * @param snapshot
   * @returns
   */
  filterCheckpointSnapshots?(snapshot: QueryDocumentSnapshot<T>[]): PromiseOrValue<QueryDocumentSnapshot<T>[]>;
  /**
   * The iterate function per each snapshot.
   */
  iterateCheckpoint(snapshots: QueryDocumentSnapshot<T>[], query: QuerySnapshot<T>): Promise<R[]>;
  /**
   * (Optional) Called at the end of each checkpoint.
   */
  useCheckpointResult?(checkpointResults: IterateFirestoreDocumentSnapshotCheckpointsIterationResult<T, R>): PromiseOrValue<void>;
}

export interface IterateFirestoreDocumentSnapshotCheckpointsIterationResult<T, R> extends IndexRef {
  /***
   * Checkpoint index number
   */
  readonly i: IndexNumber;
  /**
   * The cursor document used in this query.
   */
  readonly cursorDocument?: Maybe<QueryDocumentSnapshot<T>>;
  /**
   * Results returned from each checkpoint.
   */
  readonly results: R[];
  /**
   * All non-filtered document snapshots in this checkpoint.
   *
   * If filterCheckpointSnapshot is configured, this does not include the filtered snapshots.
   */
  readonly docSnapshots: QueryDocumentSnapshot<T>[];
  /**
   * The query snapshot for this checkpoint.
   */
  readonly docQuerySnapshot: QuerySnapshot<T>;
}

export interface IterateFirestoreDocumentSnapshotCheckpointsResult {
  /**
   * The total number of batches visited.
   */
  readonly totalCheckpoints: number;
  /**
   * The total number of snapshots that were visited.
   */
  readonly totalSnapshotsVisited: number;
  /**
   * Whether or not the total snapshots limit was reached.
   */
  readonly totalSnapshotsLimitReached: boolean;
}

/**
 * Iterates through the results of a Firestore query in several batches.
 *
 * @param config
 * @returns
 */
export async function iterateFirestoreDocumentSnapshotCheckpoints<T, R>(config: IterateFirestoreDocumentSnapshotCheckpointsConfig<T, R>): Promise<IterateFirestoreDocumentSnapshotCheckpointsResult> {
  const { iterateCheckpoint, filterCheckpointSnapshots: inputFilterCheckpointSnapshot, handleRepeatCursor: inputHandleRepeatCursor, waitBetweenCheckpoints, useCheckpointResult, constraintsFactory: inputConstraintsFactory, dynamicConstraints: inputDynamicConstraints, queryFactory, maxParallelCheckpoints = 1, limitPerCheckpoint: inputLimitPerCheckpoint, totalSnapshotsLimit: inputTotalSnapshotsLimit } = config;
  const constraintsInputIsFactory = typeof inputConstraintsFactory === 'function';
  const constraintsFactory = constraintsInputIsFactory && inputDynamicConstraints !== false ? inputConstraintsFactory : asGetter(getValueFromGetter(inputConstraintsFactory));

  /**
   * Default to the input total snapshots limit if no limit is provided, otherwise there will be no limit.
   */
  const limitPerCheckpoint = inputLimitPerCheckpoint ?? inputTotalSnapshotsLimit;
  const totalSnapshotsLimit = inputTotalSnapshotsLimit ?? Number.MAX_SAFE_INTEGER;

  let currentIndex = 0;
  let hasReachedEnd = false;
  let totalSnapshotsLimitReached = false;
  let totalSnapshotsVisited: number = 0;
  let cursorDocument: Maybe<QueryDocumentSnapshot<T>>;

  const visitedCursorPaths = new Set<FirestoreModelKey>();
  const handleRepeatCursor = typeof inputHandleRepeatCursor === 'function' ? inputHandleRepeatCursor : () => inputHandleRepeatCursor;
  const filterCheckpointSnapshot = inputFilterCheckpointSnapshot ?? mapIdentityFunction();

  async function taskInputFactory() {
    // Perform another query, then pass the results to the task factory.
    if (hasReachedEnd) {
      return null; // issue no more tasks
    }

    const constraints = constraintsFactory();
    const startAfterFilter = cursorDocument ? startAfter(cursorDocument) : undefined;

    if (startAfterFilter) {
      constraints.push(startAfterFilter);
    }

    if (limitPerCheckpoint != null) {
      const totalPossibleNumberOfItemsLeftToLoad = Math.max(0, totalSnapshotsLimit - totalSnapshotsVisited);
      const nextLimit = Math.min(limitPerCheckpoint, totalPossibleNumberOfItemsLeftToLoad);

      if (nextLimit === 0) {
        // we're at the end
        cursorDocument = null;
        hasReachedEnd = true;
        totalSnapshotsLimitReached = true; // should have already been reached, but flag again just incase
        return null; // exit immediately
      } else {
        constraints.push(limit(nextLimit));
      }
    }

    const query = queryFactory.query(constraints);
    const docQuerySnapshot = await query.getDocs();
    const docSnapshots = docQuerySnapshot.docs;

    // check for repeat cursor
    const nextCursorDocument: Maybe<QueryDocumentSnapshot<T>> = lastValue(docSnapshots);

    if (nextCursorDocument != null) {
      const cursorPath = readFirestoreModelKeyFromDocumentSnapshot(nextCursorDocument);

      if (visitedCursorPaths.has(cursorPath)) {
        const shouldContinue = await handleRepeatCursor(nextCursorDocument);

        if (shouldContinue === false) {
          cursorDocument = null;
          hasReachedEnd = true;
          return null; // exit immediately
        }
      } else {
        visitedCursorPaths.add(cursorPath);
      }
    }

    cursorDocument = nextCursorDocument; // set the next cursor document

    // update state
    const newSnapshotsVisited = docSnapshots.length;
    totalSnapshotsVisited += newSnapshotsVisited;

    if (!cursorDocument || totalSnapshotsVisited > totalSnapshotsLimit) {
      hasReachedEnd = true; // mark as having reached the end
      totalSnapshotsLimitReached = true; // mark as having reached the limit
    }

    const i = currentIndex;
    currentIndex += 1; // increase our current index

    return {
      i,
      docQuerySnapshot
    };
  }

  const performTaskFn = performTasksFromFactoryInParallelFunction({
    maxParallelTasks: maxParallelCheckpoints,
    waitBetweenTasks: waitBetweenCheckpoints,
    taskFactory: async ({ i, docQuerySnapshot }: { i: IndexNumber; docQuerySnapshot: QuerySnapshot<T> }) => {
      const docSnapshots = await filterCheckpointSnapshot(docQuerySnapshot.docs);
      const results = await iterateCheckpoint(docSnapshots, docQuerySnapshot);
      const checkpointResults: IterateFirestoreDocumentSnapshotCheckpointsIterationResult<T, R> = {
        i,
        cursorDocument,
        results,
        docSnapshots,
        docQuerySnapshot
      };

      await useCheckpointResult?.(checkpointResults);
    }
  });

  await performTaskFn(taskInputFactory);

  const result: IterateFirestoreDocumentSnapshotCheckpointsResult = {
    totalCheckpoints: currentIndex,
    totalSnapshotsVisited,
    totalSnapshotsLimitReached
  };

  return result;
}

// MARK: Utility
export function allowDocumentSnapshotWithPathOnceFilter<T extends DocumentSnapshot>(): AllowValueOnceFilter<T, FirestoreModelKey> {
  return allowValueOnceFilter(readFirestoreModelKeyFromDocumentSnapshot);
}
