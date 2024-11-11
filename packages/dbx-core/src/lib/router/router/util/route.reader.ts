import { ObservableOrValueGetter, MaybeObservableOrValueGetter, switchMapToDefault, maybeValueFromObservableOrValueGetter, asObservableFromGetter } from '@dereekb/rxjs';
import { Destroyable, Maybe } from '@dereekb/util';
import { BehaviorSubject, combineLatest, distinctUntilChanged, first, map, Observable, shareReplay } from 'rxjs';
import { DbxRouterService } from '../service/router.service';

/**
 * Interface used for reading a single value from the DbxRouterService. Supports a default value.
 */
export interface DbxRouteParamReader<T> {
  /**
   * The param value as read from the current router state.
   */
  readonly paramValue$: Observable<Maybe<T>>;
  /**
   * The default value observable.
   */
  readonly defaultValue$: Observable<Maybe<T>>;
  /**
   * The final computed value
   */
  readonly value$: Observable<Maybe<T>>;

  /**
   * Param key getter/setters.
   */
  get paramKey(): string;
  set paramKey(paramKey: Maybe<string>);

  /**
   * Sets the default value source.
   *
   * @param defaultValue
   */
  setDefaultValue(defaultValue: MaybeObservableOrValueGetter<T>): void;
  /**
   * Updates the value on the current route for the paramKey.
   *
   * @param value
   */
  setParamValue(value: MaybeObservableOrValueGetter<T>): void;
}

/**
 * Utility class used for reading a single value from the DbxRouterService.
 */
export class DbxRouteParamReaderInstance<T> implements DbxRouteParamReader<T>, Destroyable {
  private _paramKey: BehaviorSubject<string>;
  private _defaultValue: BehaviorSubject<Maybe<ObservableOrValueGetter<Maybe<T>>>>;

  readonly paramKey$: Observable<string>;
  readonly paramValue$: Observable<Maybe<T>>;
  readonly nextDefaultValue$: Observable<Maybe<T>>;
  readonly defaultValue$: Observable<Maybe<T>>;
  readonly value$: Observable<Maybe<T>>;

  constructor(readonly dbxRouterService: DbxRouterService, readonly defaultParamKey: string, readonly defaultValue?: MaybeObservableOrValueGetter<T>) {
    this._paramKey = new BehaviorSubject<string>(this.defaultParamKey);
    this._defaultValue = new BehaviorSubject<Maybe<ObservableOrValueGetter<Maybe<T>>>>(this.defaultValue);

    this.paramKey$ = this._paramKey.asObservable();

    this.paramValue$ = combineLatest([this.paramKey$, this.dbxRouterService.params$]).pipe(
      map(([key, params]) => {
        return (params[key] as Maybe<T>) ?? undefined;
      }),
      distinctUntilChanged(),
      shareReplay(1)
    );

    this.nextDefaultValue$ = this._defaultValue.pipe(maybeValueFromObservableOrValueGetter(), shareReplay(1));
    this.defaultValue$ = this._defaultValue.pipe(maybeValueFromObservableOrValueGetter(), shareReplay(1));
    this.value$ = this.paramValue$.pipe(switchMapToDefault(this.defaultValue$), shareReplay(1));
  }

  destroy(): void {
    this._paramKey.complete();
    this._defaultValue.complete();
  }

  get paramKey(): string {
    return this._paramKey.value;
  }

  set paramKey(paramKey: Maybe<string>) {
    this._paramKey.next(paramKey || this.defaultParamKey);
  }

  setDefaultValue(defaultValue: MaybeObservableOrValueGetter<T>): void {
    this._defaultValue.next(defaultValue ?? this.defaultValue);
  }

  /**
   * Convenience function to set the param value on the router.
   *
   * @param value
   */
  setParamValue(value: MaybeObservableOrValueGetter<T>): void {
    combineLatest([this.paramKey$, asObservableFromGetter(value)])
      .pipe(first())
      .subscribe(([paramKey, value]) => {
        this.dbxRouterService.updateParams({ [paramKey]: value });
      });
  }
}
