import { Directive, Host, OnInit, OnDestroy, Input } from '@angular/core';
import { SubscriptionObject } from '@dereekb/ngx-core';
import { addSeconds, isPast } from 'date-fns';
import { Observable, of, combineLatest } from 'rxjs';
import { catchError, exhaustMap, filter, first, map, mergeMap, switchMap } from 'rxjs/operators';
import { ActionContextStoreSourceInstance } from '../action/action';
import { ActionContextStore } from '../action/action.store';
import { DbNgxError } from '../error/error';
import { LockSet } from '../utility/lock';
import { FormComponent, FormComponentState } from './form.component';

export interface DbNgxActionFormTriggerResult {
  value?: any;
  reject?: DbNgxError;
}

export type DbNgxActionFormValidateFn<T = any> = (value: T) => Observable<boolean>;
export type DbNgxActionFormModifiedFn<T = any> = (value: T) => Observable<boolean>;

export const APP_ACTION_FORM_DISABLED_KEY = 'actionForm';

/**
 * Used with an action to bind a form to an action as it's value source.
 *
 * If the form has errors when the action is trigger, it will reject the action.
 *
 * If the source is not considered modified, the trigger will be ignored.
 */
@Directive({
  selector: '[dbxActionForm]'
})
export class DbNgxActionFormDirective<T = any> implements OnInit, OnDestroy {

  readonly lockSet = new LockSet();

  /**
   * Optional validator that checks whether or not the value is
   * ready to send before the context store is marked enabled.
   */
  @Input()
  appActionFormValidator?: DbNgxActionFormValidateFn<T>;

  /**
   * Optional function that checks whether or not the value has been modified.
   */
  @Input()
  appActionFormModified?: DbNgxActionFormModifiedFn<T>;

  private _triggeredSub = new SubscriptionObject();
  private _isCompleteSub = new SubscriptionObject();

  constructor(@Host() public readonly form: FormComponent, public readonly source: ActionContextStoreSourceInstance<object, any>) {
    if (form.lockSet) {
      this.lockSet.addChildLockSet(form.lockSet, 'form');
    }

    this.lockSet.addChildLockSet(source.lockSet, 'source');
  }

  ngOnInit(): void {

    // Pass data from the form to the source when triggered.
    this._triggeredSub.subscription = this.source.triggered$.pipe(
      switchMap(() => {
        const doNothing = {}; // nothing, form not complete

        if (this.form.isComplete) {
          const value = this.form.value;

          return this.preCheckReadyValue(value).pipe(
            first(),
            switchMap((canContinue) => {
              if (canContinue) {
                return this.readyValue(value).pipe(first());
              } else {
                return of(doNothing);
              }
            }),
            catchError((error) => of({ error } as DbNgxActionFormTriggerResult))
          );
        } else {
          return of(doNothing);
        }
      }),
    ).subscribe((result: DbNgxActionFormTriggerResult) => {
      if (result.reject) {
        this.source.reject(result.reject);
      } else if (result.value != null) {
        this.source.readyValue(result.value);
      } else {
        // value isn't ready
      }
    });

    // Update the enabled/disabled state
    this._isCompleteSub.subscription = this.form.stream$.pipe(
      filter((x) => x.state !== FormComponentState.INITIALIZING),
      switchMap((event) => {

        // Use both changes count and whether or not something was in the past to guage whether or not the item has been touched.
        // Angular Form's untouched is whether or not focus has been lost but we can still recieve value updates.
        // More than a certain amount of updates implies that it is being typed into.
        const isProbablyTouched = !event.untouched ||
          (event.changesCount > 3 && isPast(addSeconds(event.lastResetAt ?? new Date(), 2)));

        // console.log('Event: ', event, isProbablyTouched);

        const value = this.form.value;

        let validatorObs: Observable<boolean>;

        const initialIsValidCheck = event.isComplete;
        if (initialIsValidCheck) {
          validatorObs = (this.appActionFormValidator) ? this.appActionFormValidator(value) : of(true);
        } else {
          validatorObs = of(false);
        }

        let modifiedObs: Observable<boolean>;

        const isConsideredModified = (event.pristine === false && isProbablyTouched);
        if (isConsideredModified) {
          modifiedObs = (this.appActionFormModified) ? this.appActionFormModified(value) : of(true);
        } else {
          modifiedObs = of(false);
        }

        return combineLatest([
          validatorObs,
          modifiedObs
        ]).pipe(
          first(),
          map(([valid, modified]: [boolean, boolean]) => ({ valid, modified, event }))
        );
      })
    ).subscribe(({ valid, modified, event }) => {

      // Update Modified State
      this.source.setIsModified(modified);

      // Disable if the form is not yet complete/valid.
      this.source.enable(APP_ACTION_FORM_DISABLED_KEY, valid);
    });

    // TODO: Watch the working state and stop allowing input on working..?
    // TODO: Watch the disabled state for when another disabled key disables this form.
  }

  ngOnDestroy(): void {
    this.source.enable(APP_ACTION_FORM_DISABLED_KEY);
    this.lockSet.destroyOnNextUnlock(() => {
      this._triggeredSub.destroy();
      this._isCompleteSub.destroy();
    });
  }

  protected preCheckReadyValue(value: T): Observable<boolean> {
    let validatorObs: Observable<boolean> = (this.appActionFormValidator) ? this.appActionFormValidator(value) : of(true);
    let modifiedObs: Observable<boolean> = (this.appActionFormModified) ? this.appActionFormModified(value) : of(true);

    return combineLatest([
      validatorObs,
      modifiedObs
    ]).pipe(
      first(),
      map(([valid, modified]: [boolean, boolean]) => valid && modified)
    );
  }

  protected readyValue(value: T): Observable<DbNgxActionFormTriggerResult> {
    return of({ value });
  }

}
