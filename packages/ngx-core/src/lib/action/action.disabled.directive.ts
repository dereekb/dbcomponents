import { Directive, Host, Input, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { AbstractSubscriptionDirective } from '../subscription';
import { ActionContextStoreSourceInstance } from './action';

export const APP_ACTION_DISABLED_DIRECTIVE_KEY = 'app_action_disabled';

/**
 * Directive that allows disabling an action using the inputs.
 */
@Directive({
  selector: '[dbxActionDisabled]'
})
export class DbNgxActionDisabledDirective<T, O> extends AbstractSubscriptionDirective implements OnInit, OnDestroy {

  private _disabled = new BehaviorSubject<boolean>(false);
  readonly disabled$ = this._disabled.pipe(distinctUntilChanged());

  constructor(@Host() public readonly source: ActionContextStoreSourceInstance<T, O>) {
    super();
  }

  ngOnInit(): void {
    this.sub = this.disabled$.subscribe((x) => {
      this.source.disable(APP_ACTION_DISABLED_DIRECTIVE_KEY, x);
    });
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();
    this._disabled.complete();
    this.source.enable(APP_ACTION_DISABLED_DIRECTIVE_KEY);
  }

  @Input('dbxActionDisabled')
  get disabled(): boolean {
    return this._disabled.value;
  }

  set disabled(disabled: boolean) {
    this._disabled.next(disabled);
  }

}
