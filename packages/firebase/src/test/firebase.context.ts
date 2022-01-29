import { JestTestContextFactory } from '@dereekb/util';
import { firebaseTestBuilder, FirebaseTestingContextFixture } from './firebase';

export const TESTING_AUTHORIZED_FIREBASE_USER_ID = '0';

export type FirebaseTestContextFactory = JestTestContextFactory<FirebaseTestingContextFixture>;

export const authorizedFirebase: FirebaseTestContextFactory = firebaseTestBuilder({
  testEnvironment: {
    firestore: {
      rules: `
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /{document=**} {
            allow read, write: if true;
          }
        }
      }
      `
    }
  },
  rulesContext: { userId: TESTING_AUTHORIZED_FIREBASE_USER_ID }
});
