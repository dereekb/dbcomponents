import { range } from '../array/array.number';
import { type Milliseconds } from '../date/date';
import { type PrimativeKey, type ReadKeyFunction } from '../key';
import { multiValueMapBuilder } from '../map';
import { incrementingNumberFactory } from '../number';
import { type StringFactory, stringFactoryFromFactory } from '../string/factory';
import { type IndexNumber } from '../value';
import { type Maybe } from '../value/maybe.type';
import { waitForMs } from './wait';

export type RunAsyncTaskForValueConfig<T = unknown> = Omit<PerformAsyncTaskConfig<T>, 'throwError'>;

export type RunAsyncTasksForValuesConfig<T = unknown> = Omit<PerformAsyncTasksConfig<T>, 'throwError'>;

/**
 * Runs the task using the input config, and returns the value. Is always configured to throw the error if it fails.
 */
export async function runAsyncTaskForValue<O>(taskFn: () => Promise<O>, config?: RunAsyncTaskForValueConfig<0>): Promise<Maybe<O>> {
  const { value } = await performAsyncTask(taskFn, {
    ...config,
    throwError: true
  });

  return value;
}

/**
 * Returns the task for each input value, and returns the values. Is always configured to throw the error if it fails.
 *
 * @param input
 * @param taskFn
 * @param config
 * @returns
 */
export async function runAsyncTasksForValues<T, K = unknown>(input: T[], taskFn: PromiseAsyncTaskFn<T, K>, config?: RunAsyncTasksForValuesConfig<T>): Promise<K[]> {
  const results = await performAsyncTasks(input, taskFn, {
    ...config,
    throwError: true
  });

  return results.results.map((x) => x[1]);
}

// MARK: Perform
export type PromiseAsyncTaskFn<T, K = unknown> = (value: T, tryNumber?: number) => Promise<K>;

export interface PerformAsyncTaskResult<O> {
  readonly value: Maybe<O>;
  readonly success: boolean;
}

export interface PerformAsyncTasksResult<I, O> {
  readonly succeded: I[];
  readonly failed: I[];
  readonly results: [I, O][];
  readonly errors: [I, unknown][];
}

export interface PerformAsyncTaskConfig<I = unknown> {
  /**
   * Whether or not to throw an error if the task fails. Defaults to true.
   *
   * If retries are allowed, this will throw the final error from the final try.
   */
  readonly throwError?: boolean;
  /**
   * Whether or not retries are allowed. Defaults to false/0.
   */
  readonly retriesAllowed?: number | false;
  /**
   * The amount of time to wait between retries. Defaults to 100 ms.
   */
  readonly retryWait?: number;
  /**
   * Optional function to use before a retry.
   */
  readonly beforeRetry?: (value: I, tryNumber?: number) => void | Promise<void>;
}

export interface PerformAsyncTasksConfig<I = unknown, K extends PrimativeKey = PerformTasksInParallelTaskUniqueKey> extends PerformAsyncTaskConfig<I>, Omit<PerformTasksInParallelFunctionConfig<I, K>, 'taskFactory'> {}

/**
 * Performs the input tasks, and will retry tasks if they fail, up to a certain point.
 *
 * This is useful for retrying sections that may experience optimistic concurrency collisions.
 */
export async function performAsyncTasks<I, O = unknown, K extends PrimativeKey = PerformTasksInParallelTaskUniqueKey>(input: I[], taskFn: PromiseAsyncTaskFn<I, O>, config: PerformAsyncTasksConfig<I, K> = { throwError: true }): Promise<PerformAsyncTasksResult<I, O>> {
  const { sequential, maxParallelTasks, waitBetweenTasks, nonConcurrentTaskKeyFactory } = config;
  const taskResults: [I, O, boolean][] = [];

  await performTasksInParallelFunction({
    nonConcurrentTaskKeyFactory,
    taskFactory: (value: I, i) =>
      _performAsyncTask(value, taskFn, config).then((x) => {
        taskResults[i] = x;
      }),
    maxParallelTasks,
    sequential,
    waitBetweenTasks
  })(input);

  const succeded: I[] = [];
  const failed: I[] = [];
  const results: [I, O][] = [];
  const errors: [I, unknown][] = [];

  taskResults.forEach((x) => {
    const success = x[2];

    if (success) {
      succeded.push(x[0]);
      results.push([x[0], x[1]]);
    } else {
      failed.push(x[0]);
      errors.push([x[0], x[1]]);
    }
  });

  return {
    succeded,
    failed,
    results,
    errors
  };
}

export async function performAsyncTask<O>(taskFn: () => Promise<O>, config?: PerformAsyncTaskConfig<0>): Promise<PerformAsyncTaskResult<O>> {
  const [, value, success] = await _performAsyncTask(0, () => taskFn(), config);
  return { value, success };
}

async function _performAsyncTask<I, O>(value: I, taskFn: PromiseAsyncTaskFn<I, O>, config: PerformAsyncTaskConfig<I> = {}): Promise<[I, O, boolean]> {
  const { throwError: inputThrowError, retriesAllowed: inputRetriesAllowed, retryWait = 200, beforeRetry } = config;
  const throwError = inputThrowError ?? true; // throw errors by default
  const retriesAllowed = inputRetriesAllowed ? inputRetriesAllowed : 0;

  async function tryTask(value: I, tryNumber: number): Promise<[O, true] | [Error | unknown, false]> {
    try {
      const result: O = await taskFn(value, tryNumber);
      return [result, true];
    } catch (e) {
      return [e, false];
    }
  }

  async function iterateTask(value: I, tryNumber: number): Promise<[I, O, boolean]> {
    const result = await tryTask(value, tryNumber);
    const success = result[1];

    async function doNextTry() {
      const nextTryNumber = tryNumber + 1;

      if (beforeRetry) {
        await beforeRetry(value, nextTryNumber);
      }

      return iterateTask(value, tryNumber + 1);
    }

    if (success) {
      return [value, ...result];
    }

    const retriesRemaining = retriesAllowed - tryNumber;

    if (retriesRemaining > 0) {
      return retryWait ? waitForMs(retryWait).then(() => doNextTry()) : doNextTry();
    } else {
      // Error out.
      if (throwError) {
        throw result[0];
      } else {
        return [value, undefined as unknown as O, false];
      }
    }
  }

  return iterateTask(value, 0);
}

// MARK: Parallel
/**
 * Used as a key to identify the "group" that a task belongs to to prevent other concurrent tasks from that group from running in parallel when parallel execution is desired.
 */
export type PerformTasksInParallelTaskUniqueKey = string;

export interface PerformTasksInParallelFunctionConfig<I, K extends PrimativeKey = PerformTasksInParallelTaskUniqueKey> {
  /**
   * Creates a promise from the input.
   */
  readonly taskFactory: (input: I, value: IndexNumber, taskKey: K) => Promise<void>;
  /**
   * This function is used to uniquely identify tasks that may use the same resources to prevent such tasks from running concurrently.
   *
   * When in use the order is not guranteed.
   */
  readonly nonConcurrentTaskKeyFactory?: ReadKeyFunction<I, K>;
  /**
   * Whether or not tasks are performed sequentially or if tasks are all done in "parellel".
   *
   * Is ignored if maxParallelTasks is set.
   */
  readonly sequential?: boolean;
  /**
   * The maximum number of items to process in parallel. If there is no max, then all items will be processed in parallel.
   */
  readonly maxParallelTasks?: number;
  /**
   * Optional amount of time to wait between each task.
   */
  readonly waitBetweenTasks?: Milliseconds;
}

/**
 * Function that awaits a promise generate from each of the input values.
 *
 * Will throw an error if any error is encountered as soon as it is encountered. No further tasks will be dispatched, but tasks that have already been dispatched will continue to run.
 */
export type PerformTasksInParallelFunction<I> = (input: I[]) => Promise<void>;

/**
 * Convenience function for calling performTasksInParallelFunction() with the given input.
 *
 * @param input
 * @param config
 * @returns
 */
export function performTasksInParallel<I, K extends PrimativeKey = PerformTasksInParallelTaskUniqueKey>(input: I[], config: PerformTasksInParallelFunctionConfig<I, K>): Promise<void> {
  return performTasksInParallelFunction(config)(input);
}

/**
 * Creates a function that performs tasks in parallel.
 *
 * @param config
 */
export function performTasksInParallelFunction<I, K extends PrimativeKey = PerformTasksInParallelTaskUniqueKey>(config: PerformTasksInParallelFunctionConfig<I, K>): PerformTasksInParallelFunction<I> {
  const defaultNonConcurrentTaskKeyFactory = stringFactoryFromFactory(incrementingNumberFactory(), (x) => x.toString()) as unknown as StringFactory<any>;
  const { taskFactory, sequential, nonConcurrentTaskKeyFactory, maxParallelTasks: inputMaxParallelTasks, waitBetweenTasks } = config;
  const maxParallelTasks = inputMaxParallelTasks ?? (sequential ? 1 : undefined);

  if (!maxParallelTasks && !nonConcurrentTaskKeyFactory) {
    // if the max number of parallel tasks is not defined, then run all tasks at once, unless there is a nonConcurrentTaskKeyFactory
    return async (input: I[]) => {
      await Promise.all(input.map((value, i) => taskFactory(value, i, defaultNonConcurrentTaskKeyFactory())));
    };
  } else {
    return (input: I[]) => {
      if (input.length === 0) {
        return Promise.resolve();
      }

      return new Promise(async (resolve, reject) => {
        const taskKeyFactory = nonConcurrentTaskKeyFactory ?? defaultNonConcurrentTaskKeyFactory;
        const maxPromisesToRunAtOneTime = Math.min(maxParallelTasks ?? 100, input.length);
        const incompleteTasks = input.map((x) => [x, taskKeyFactory(x)] as [I, K]).reverse(); // reverse to use push/pop

        let currentRunIndex = 0;
        let finishedParallels = 0;
        let hasEncounteredFailure = false;

        /**
         * Set of tasks keys that are currently running.
         */
        let currentParellelTaskKeys = new Set<K>();
        const waitingConcurrentTasks = multiValueMapBuilder<typeof incompleteTasks[0], K>();

        function getNextTask(): typeof incompleteTasks[0] | undefined {
          let nextTask: typeof incompleteTasks[0] | undefined = undefined;

          while (!nextTask) {
            nextTask = incompleteTasks.pop();

            if (nextTask) {
              const key = nextTask[1];

              if (currentParellelTaskKeys.has(key)) {
                waitingConcurrentTasks.addTuples(key, nextTask); // wrap the tuple in an array to add it properly.
                nextTask = undefined; // clear to continue loop
              } else {
                currentParellelTaskKeys.add(key); // add to the current task keys, exit loop
                break;
              }
            } else {
              break; // no tasks remaining, break.
            }
          }

          return nextTask;
        }

        function onTaskCompleted(task: typeof incompleteTasks[0]): void {
          const key = task[1];

          currentParellelTaskKeys.delete(key);
          const waitingForKey = waitingConcurrentTasks.get(key);

          const nextWaitingTask = waitingForKey.shift(); // take from the front to retain unique task order

          if (nextWaitingTask) {
            incompleteTasks.push(nextWaitingTask); // push to front for the next dispatch to take
          }
        }

        // start initial promises
        function dispatchNextPromise() {
          // if a failure has been encountered then the promise has already been rejected.
          if (!hasEncounteredFailure) {
            const nextTask = getNextTask();

            if (nextTask) {
              const promise = taskFactory(nextTask[0], currentRunIndex, nextTask[1]);
              currentRunIndex += 1;

              promise.then(
                () => {
                  onTaskCompleted(nextTask);
                  setTimeout(dispatchNextPromise, waitBetweenTasks);
                },
                (e) => {
                  hasEncounteredFailure = true;
                  reject(e);
                }
              );
            } else {
              finishedParallels += 1;

              // only resolve after the last parallel is complete
              if (finishedParallels === maxPromisesToRunAtOneTime) {
                resolve();
              }
            }
          }
        }

        // run the initial promises
        range(0, maxPromisesToRunAtOneTime).forEach(() => {
          dispatchNextPromise();
        });
      });
    };
  }
}
