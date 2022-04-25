import { UserRecord } from 'firebase-admin/lib/auth/user-record';
import * as functions from 'firebase-functions';
import { onEventWithDemoNestContext } from '../function';

/**
 * Listens for users to be created and initializes them.
 */
export const initUserOnCreate = onEventWithDemoNestContext<UserRecord>((withNest) =>
  functions.auth.user().onCreate(withNest(async (nest, data: UserRecord, context) => {
    const uid = data.uid;

    console.log('Init user: ', uid, context);

    if (uid) {
      await nest.profileActions.initProfileForUid(uid);
    }
  }))
);
