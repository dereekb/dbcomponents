import { map, Observable } from 'rxjs';
import { SetIncludesMode, ArrayOrValue, Maybe, setIncludesFunction } from '@dereekb/util';
import { TransitionService, TransitionHookFn, Transition, HookMatchCriteria } from '@uirouter/core';
import { AuthRole } from '../../../auth.role';
import { DbxAuthService } from '../../../service/auth.service';
import { AuthTransitionDecision, AuthTransitionHookOptions, makeAuthTransitionHook } from './hook';

export interface HasAuthRoleHookConfig {
  options: AuthTransitionHookOptions;
}

/**
 * UIRouter State data with configuration for the hasAuthRoleHook.
 */
export interface HasAuthRoleStateData {

  /**
   * Auth roles marked for this state
   */
  authRoles: ArrayOrValue<AuthRole>;

  /**
   * How to use the above auth roles. This defaults to 'all' by default.
   */
  authRolesMode?: SetIncludesMode;

}

/**
 * This hook redirects to the configured default state when a user:
 * 
 * - does not have an allowed state
 * - has a disallowed state
 */
export function enableHasAuthRoleHook(transitionService: TransitionService, config: HasAuthRoleHookConfig): void {

  // Matches if the destination state's data property has a truthy 'isSecure' property
  const isSecureCriteria: HookMatchCriteria = {
    entering: (state) => {
      const data = state?.data as Maybe<Partial<HasAuthRoleStateData>>;
      const match = Boolean(data?.authRoles);
      return match;
    }
  };

  const assertHasAuthRole: TransitionHookFn = makeAuthTransitionHook({
    ...config.options,
    makeDecisionsObs(transition: Transition, authService: DbxAuthService): Observable<AuthTransitionDecision> {
      const targetState = transition.targetState();
      const data: HasAuthRoleStateData = targetState.state().data;
      const requiredRoles = new Set<AuthRole>(data.authRoles);
      const setIncludes = setIncludesFunction(requiredRoles, data.authRolesMode);

      return authService.authUserState$.pipe(
        map(x => setIncludes(x))
      );
    }
  });

  // Register the "requires auth" hook with the TransitionsService
  transitionService.onBefore(isSecureCriteria, assertHasAuthRole, { priority: 100 });
}
