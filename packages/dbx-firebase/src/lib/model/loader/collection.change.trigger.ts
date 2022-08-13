import { SubscriptionObject, ObservableOrValue, asObservable } from '@dereekb/rxjs';
import { BehaviorSubject, filter, switchMap, exhaustMap, EMPTY } from 'rxjs';
import { Destroyable, Maybe, Initialized } from '@dereekb/util';
import { DbxFirebaseCollectionChangeWatcher, dbxFirebaseCollectionChangeWatcher } from './collection.change.watcher';
import { DbxFirebaseCollectionLoaderAccessor } from './collection.loader';

export type DbxFirebaseCollectionChangeTriggerFunction<S extends DbxFirebaseCollectionLoaderAccessor<any>> = (instance: DbxFirebaseCollectionChangeTriggerInstance<S>) => ObservableOrValue<void>;

/**
 * Restarts the store.
 *
 * @param instance
 * @returns
 */
export const DEFAULT_FIREBASE_COLLECTION_CHANGE_TRIGGER_FUNCTION: DbxFirebaseCollectionChangeTriggerFunction<any> = (instance) => instance.watcher.store.restart();

export interface DbxFirebaseCollectionChangeTriggerInstanceConfig<S extends DbxFirebaseCollectionLoaderAccessor<any>> {
  readonly watcher: DbxFirebaseCollectionChangeWatcher<S> & Partial<Destroyable>;
  /**
   * Whether or not to also destroy the watcher when the trigger instance is destroyed.
   *
   * Defaults to false.
   */
  readonly destroyWatcherOnDestroy?: boolean;
  /**
   * Initial trigger function to use.
   *
   * By default restarts the store.
   */
  readonly triggerFunction?: Maybe<DbxFirebaseCollectionChangeTriggerFunction<S>>;
}

export interface DbxFirebaseCollectionChangeTrigger<S extends DbxFirebaseCollectionLoaderAccessor<any>> {
  readonly watcher: DbxFirebaseCollectionChangeWatcher<S>;
  triggerFunction?: Maybe<DbxFirebaseCollectionChangeTriggerFunction<S>>;
}

export class DbxFirebaseCollectionChangeTriggerInstance<S extends DbxFirebaseCollectionLoaderAccessor<any>> implements DbxFirebaseCollectionChangeTrigger<S>, Initialized, Destroyable {
  readonly watcher: DbxFirebaseCollectionChangeWatcher<S>;

  private _triggerFunction = new BehaviorSubject<Maybe<DbxFirebaseCollectionChangeTriggerFunction<S>>>(undefined);
  private _sub = new SubscriptionObject();

  constructor(readonly config: DbxFirebaseCollectionChangeTriggerInstanceConfig<S>) {
    this.watcher = config.watcher;
    this.triggerFunction = config.triggerFunction ?? DEFAULT_FIREBASE_COLLECTION_CHANGE_TRIGGER_FUNCTION;
  }

  init(): void {
    this._sub.subscription = this._triggerFunction
      .pipe(
        switchMap((triggerFunction) => {
          if (triggerFunction) {
            return this.watcher.triggered$.pipe(
              filter((triggered) => triggered),
              exhaustMap(() => asObservable(triggerFunction(this)))
            );
          } else {
            return EMPTY;
          }
        })
      )
      .subscribe();
  }

  destroy(): void {
    this._triggerFunction.complete();

    if (this.config.destroyWatcherOnDestroy === true) {
      (this.watcher as unknown as Destroyable)?.destroy();
    }
  }

  get triggerFunction(): Maybe<DbxFirebaseCollectionChangeTriggerFunction<S>> {
    return this._triggerFunction.value;
  }

  set triggerFunction(triggerFunction: Maybe<DbxFirebaseCollectionChangeTriggerFunction<S>>) {
    this._triggerFunction.next(triggerFunction);
  }
}

/**
 * Creates a new DbxFirebaseCollectionChangeWatcher, set the modes to "auto", and creates a new DbxFirebaseCollectionChangeTriggerInstance.
 *
 * @param store
 * @param triggerFunction
 * @returns
 */
export function dbxFirebaseCollectionChangeTriggerForStore<S extends DbxFirebaseCollectionLoaderAccessor<any>>(store: S, triggerFunction?: Maybe<DbxFirebaseCollectionChangeTriggerFunction<S>>): DbxFirebaseCollectionChangeTriggerInstance<S> {
  return dbxFirebaseCollectionChangeTrigger<S>({
    watcher: dbxFirebaseCollectionChangeWatcher<S>(store, 'auto'),
    destroyWatcherOnDestroy: true,
    triggerFunction
  });
}

export function dbxFirebaseCollectionChangeTriggerForWatcher<S extends DbxFirebaseCollectionLoaderAccessor<any>>(watcher: DbxFirebaseCollectionChangeWatcher<S>, triggerFunction?: Maybe<DbxFirebaseCollectionChangeTriggerFunction<S>>): DbxFirebaseCollectionChangeTriggerInstance<S> {
  return dbxFirebaseCollectionChangeTrigger<S>({
    watcher,
    destroyWatcherOnDestroy: false,
    triggerFunction
  });
}

export function dbxFirebaseCollectionChangeTrigger<S extends DbxFirebaseCollectionLoaderAccessor<any>>(config: DbxFirebaseCollectionChangeTriggerInstanceConfig<S>): DbxFirebaseCollectionChangeTriggerInstance<S> {
  return new DbxFirebaseCollectionChangeTriggerInstance(config);
}
