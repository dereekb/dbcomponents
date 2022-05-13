import { filterMaybe } from '@dereekb/rxjs';
import { BehaviorSubject } from 'rxjs';
import { Directive, Input, OnDestroy, OnInit } from "@angular/core";
import { DbxAppContextService } from "./context.service";
import { AbstractSubscriptionDirective } from '../subscription';
import { DbxAppContextState } from './context';
import { Maybe } from '@dereekb/util';


/**
 * Used to set the DbxAppContextState for an app to the input state using the DbxAppContextService.
 */
@Directive({
  selector: '[dbxAppContextState]'
})
export class DbxAppContextStateDirective extends AbstractSubscriptionDirective implements OnInit, OnDestroy {

  private _state = new BehaviorSubject<Maybe<DbxAppContextState>>(undefined);

  constructor(readonly dbxAppContextStateService: DbxAppContextService) {
    super();
  }

  ngOnInit(): void {
    this.sub = this._state.pipe(filterMaybe()).subscribe((state) => {
      this.dbxAppContextStateService.setState(state);
    });
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this._state.complete();
  }

  @Input('dbxAppContextState')
  set state(state: Maybe<DbxAppContextState>) {
    this._state.next(state);
  }

}