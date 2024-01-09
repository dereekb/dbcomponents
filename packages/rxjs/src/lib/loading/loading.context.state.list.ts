import { LimitArrayConfig, hasNonNullValue, limitArray, Maybe } from '@dereekb/util';
import { Observable, distinctUntilChanged, map, shareReplay, skipWhile } from 'rxjs';
import { loadingStateIsLoading, ListLoadingState } from './loading.state';
import { AbstractLoadingEventForLoadingPairConfig, AbstractLoadingStateContext, AbstractLoadingStateContextInstance, AbstractLoadingStateEvent, LoadingStateContextInstanceInputConfig } from './loading.context.state';
import { isListLoadingStateEmpty, listLoadingStateIsEmpty } from './loading.state.list';

export interface ListLoadingStateContextEvent<T> extends AbstractLoadingStateEvent<T[]> {
  value?: Maybe<T[]>;
}

export interface LoadingEventForListLoadingStateConfig<S extends ListLoadingState<unknown> = ListLoadingState<unknown>> extends AbstractLoadingEventForLoadingPairConfig<S>, Partial<LimitArrayConfig> {}

export interface ListLoadingStateContext<L = unknown, S extends ListLoadingState<L> = ListLoadingState<L>> extends AbstractLoadingStateContext<L[], S, ListLoadingStateContextEvent<L>> {
  readonly list$: Observable<L[]>;
  readonly isEmpty$: Observable<boolean>;
}

/**
 * LoadingContext implementation that uses a ListLoadingState observable.
 */
export class ListLoadingStateContextInstance<L = unknown, S extends ListLoadingState<L> = ListLoadingState<L>> extends AbstractLoadingStateContextInstance<L[], S, ListLoadingStateContextEvent<L>, LoadingEventForListLoadingStateConfig<S>> {
  /**
   * Returns the current values or an empty list.
   */
  readonly list$: Observable<L[]> = this.stream$.pipe(
    map((x) => x.value ?? []),
    shareReplay(1)
  );

  /**
   * Returns true while loading and the current value is considered empty.
   */
  readonly isEmptyLoading$: Observable<boolean> = this.stream$.pipe(
    map((x) => loadingStateIsLoading(x) && listLoadingStateIsEmpty(x)),
    distinctUntilChanged(),
    shareReplay(1)
  );

  /**
   * Whether or not the current value is empty.
   *
   * Only resolves when the first non-loading event has occured.
   *
   * After that, will return true if the value is empty even if loading a new value.
   */
  readonly isEmpty$: Observable<boolean> = this.stream$.pipe(
    skipWhile((x) => loadingStateIsLoading(x)), // skip until the first non-loading event has occured
    isListLoadingStateEmpty(),
    distinctUntilChanged()
  );

  /**
   * Whether or not the current value is empty and not loading.
   *
   * Only resolves when the first non-loading event has occured.
   *
   * After that, will return true if the value is empty even if loading a new value.
   */
  readonly isEmptyAndNotLoading$: Observable<boolean> = this.stream$.pipe(
    skipWhile((x) => loadingStateIsLoading(x)), // skip until the first non-loading event has occured
    map((x) => !loadingStateIsLoading(x) && listLoadingStateIsEmpty(x)),
    distinctUntilChanged()
  );

  protected loadingEventForLoadingPair(state: S, config: LoadingEventForListLoadingStateConfig = {}): ListLoadingStateContextEvent<L> {
    const { showLoadingOnNoValue } = config;

    let loading = state?.loading;
    const error = state?.error;
    let value = state?.value;

    const hasValue = value != null;

    if (hasValue) {
      value = limitArray(value, config); // Always limit the value/results.
    }

    // If there is no error
    if (!hasNonNullValue(error)) {
      if (showLoadingOnNoValue) {
        loading = !hasValue;
      } else {
        loading = loadingStateIsLoading(state);
      }
    }

    return {
      loading: Boolean(loading),
      error,
      value
    };
  }
}

export function listLoadingStateContext<T = unknown, S extends ListLoadingState<T> = ListLoadingState<T>>(config: LoadingStateContextInstanceInputConfig<S, LoadingEventForListLoadingStateConfig<S>>): ListLoadingStateContextInstance<T, S> {
  return new ListLoadingStateContextInstance(config);
}
