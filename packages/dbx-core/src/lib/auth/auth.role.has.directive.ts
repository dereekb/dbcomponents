import { ArrayOrValue } from '@dereekb/util';
import { AuthRole } from './auth.role';
import { BehaviorSubject } from 'rxjs';
import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { authRolesSetContainsAllRolesFrom, DbxAuthService } from './service';
import { Maybe } from '@dereekb/util';
import { AbstractIfDirective } from '../view/if.directive';

/**
 * Structural decorator directive similar to ngIf that embeds content if the current auth user has all of the target role(s).
 */
@Directive({
  selector: '[dbxAuthHasRoles]'
})
export class DbxAuthHasRolesDirective extends AbstractIfDirective {

  private _targetRoles = new BehaviorSubject<Maybe<ArrayOrValue<AuthRole>>>(undefined);
  readonly targetRoles$ = this._targetRoles.asObservable();

  readonly show$ = this.dbxAuthService.authRoles$.pipe(authRolesSetContainsAllRolesFrom(this.targetRoles$));

  constructor(
    templateRef: TemplateRef<any>,
    viewContainer: ViewContainerRef,
    private dbxAuthService: DbxAuthService
  ) {
    super(templateRef, viewContainer);
  }

  @Input('dbxAuthHasRoles')
  set targetRoles(roles: Maybe<ArrayOrValue<AuthRole>>) {
    this._targetRoles.next(roles);
  }

}
