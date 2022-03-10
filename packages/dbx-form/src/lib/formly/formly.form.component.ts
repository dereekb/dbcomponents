import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { distinctUntilChanged, map, throttleTime, startWith, BehaviorSubject, Observable, Subject, switchMap, shareReplay, of } from 'rxjs';
import { AbstractSubscriptionDirective } from '@dereekb/dbx-core';
import { DbxForm, DbxFormDisabledKey, DbxFormEvent, DbxFormState, DEFAULT_FORM_DISABLED_KEY, ProvideDbxMutableForm } from '../form/form';
import { DbxFormlyContext, DbxFormlyContextDelegate, DbxFormlyInitialize } from './formly.context';
import { cloneDeep } from 'lodash';
import { scanCount, switchMapMaybeObs, SubscriptionObject } from '@dereekb/rxjs';
import { BooleanStringKeyArray, BooleanStringKeyArrayUtilityInstance, Maybe } from '@dereekb/util';



/**
 * Used for rending a form from a DbxFormlyContext.
 */
@Component({
  selector: 'dbx-formly',
  exportAs: 'formly',
  template: `
    <form [formGroup]="form" class="dbx-formly">
      <formly-form [form]="form" [fields]="(fields$ | async) ?? []" [model]="model"></formly-form>
    </form>
  `,
  providers: ProvideDbxMutableForm(DbxFormlyFormComponent),
  host: {
    'class': 'dbx-formly'
  }
})
export class DbxFormlyFormComponent<T extends object> extends AbstractSubscriptionDirective implements DbxForm, DbxFormlyContextDelegate<T>, OnInit, OnDestroy {

  private _fields = new BehaviorSubject<Maybe<Observable<FormlyFieldConfig[]>>>(undefined);
  private _events = new BehaviorSubject<DbxFormEvent>({ isComplete: false, state: DbxFormState.INITIALIZING });
  private _disabled = new BehaviorSubject<BooleanStringKeyArray>(undefined);

  private _reset = new BehaviorSubject<Date>(new Date());
  private _forceUpdate = new Subject<void>();

  private _disabledSub = new SubscriptionObject();

  form = new FormGroup({});
  model: any = {};
  options: FormlyFormOptions = {};

  readonly fields$ = this._fields.pipe(switchMapMaybeObs(), distinctUntilChanged(), shareReplay(1));

  readonly stream$: Observable<DbxFormEvent> = this._reset.pipe(
    switchMap((lastResetAt) => this.form.valueChanges.pipe(
      startWith(0),
      distinctUntilChanged(),
      throttleTime(50, undefined, { leading: true, trailing: true }),
      scanCount(),
      map((changesSinceLastResetCount: number) => {
        const isReset = changesSinceLastResetCount === 1;
        const complete = this.form.valid;

        const nextState: DbxFormEvent = {
          isComplete: complete,
          state: (isReset) ? DbxFormState.RESET : DbxFormState.USED,
          untouched: this.form.untouched,
          pristine: this.form.pristine,
          changesCount: changesSinceLastResetCount,
          lastResetAt,
          disabled: this.disabled,
          isDisabled: this.isDisabled
        };

        return nextState;
      })
    )),
    shareReplay(1)
  );

  constructor(private readonly context: DbxFormlyContext<T>) {
    super();
  }

  ngOnInit(): void {
    this.context.setDelegate(this);

    this._disabledSub.subscription = this._disabled.pipe(distinctUntilChanged()).subscribe((disabled) => {
      const isDisabled = BooleanStringKeyArrayUtilityInstance.isTrue(disabled);

      if (this.form.disabled !== isDisabled) {
        if (isDisabled) {
          this.form.disable({ emitEvent: true });
        } else {
          this.form.enable({ emitEvent: true });
        }
      }
    });
  }

  override ngOnDestroy(): void {
    this.context.lockSet.onNextUnlock(() => {
      super.ngOnDestroy();
      this.context.clearDelegate(this);
      this._events.complete();
      this._fields.complete();
      this._reset.complete();
      this._forceUpdate.complete();
      this._disabled.complete();
      this._disabledSub.destroy();
    });
  }

  // MARK: Delegate
  init(initialize: DbxFormlyInitialize<T>): void {
    this._fields.next(initialize.fields);
    this._disabled.next(initialize.initialDisabled);
  }

  getValue(): Observable<T> {
    return of(this.form.value);
  }

  setValue(value: T): void {
    // console.log('set value: ', value);
    this.model = cloneDeep(value) as T;

    if (this.options.updateInitialValue) {
      this.options.updateInitialValue();
      this.options.resetModel?.();
    }

    // Re-mark as untouched and pristine.
    this.form.markAsUntouched();
    this.form.markAsPristine();

    // After updating the value, if the form is still untouched mark it as pristine again.
    // Sometimes the values get marked as changed and break pristine before a user has time to interact.
    setTimeout(() => {
      if (this.form.untouched) {
        this.form.markAsPristine();
      }
    }, 500);
  }

  resetForm(): void {
    if (this.options.resetModel) {
      this.options.resetModel();
    }
  }

  get isDisabled(): boolean {
    return BooleanStringKeyArrayUtilityInstance.isTrue(this.disabled);
  }

  get disabled(): BooleanStringKeyArray {
    return this._disabled.value;
  }

  getDisabled(): Observable<BooleanStringKeyArray> {
    return this._disabled.asObservable();
  }

  setDisabled(key?: DbxFormDisabledKey, disabled = true): void {
    this._disabled.next(BooleanStringKeyArrayUtilityInstance.set(this.disabled, key ?? DEFAULT_FORM_DISABLED_KEY, disabled))
  }

  // MARK: Update
  forceFormUpdate(): void {
    this._forceUpdate.next();
  }

}
