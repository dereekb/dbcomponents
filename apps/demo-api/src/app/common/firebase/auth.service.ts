import { CallableContextWithAuthData, AbstractFirebaseServerAuthContext, AbstractFirebaseServerAuthService, AbstractFirebaseServerAuthUserContext } from "@dereekb/firebase-server";
import { AuthClaims, AuthRoleSet } from "@dereekb/util";

export class DemoApiFirebaseServerAuthUserContext extends AbstractFirebaseServerAuthUserContext<DemoApiAuthService> {

}

export class DemoApiFirebaseServerAuthContext extends AbstractFirebaseServerAuthContext<DemoApiFirebaseServerAuthContext, DemoApiFirebaseServerAuthUserContext, DemoApiAuthService>  {

}

export class DemoApiAuthService extends AbstractFirebaseServerAuthService<DemoApiFirebaseServerAuthUserContext, DemoApiFirebaseServerAuthContext> {

  protected _context(context: CallableContextWithAuthData): DemoApiFirebaseServerAuthContext {
    return new DemoApiFirebaseServerAuthContext(this, context);
  }

  userContext(uid: string): DemoApiFirebaseServerAuthUserContext {
    return new DemoApiFirebaseServerAuthUserContext(this, uid);
  }

  readRoles(claims: AuthClaims): AuthRoleSet {
    const roles = new Set<string>();

    return roles;
  }

  claimsForRoles(roles: AuthRoleSet): AuthClaims {
    const claims: AuthClaims = {};

    return claims;
  }

}
