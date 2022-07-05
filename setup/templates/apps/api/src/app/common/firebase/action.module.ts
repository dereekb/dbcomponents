import { APP_CODE_PREFIXApiFirestoreModule } from './firestore.module';
import { APP_CODE_PREFIXFirestoreCollections } from 'FIREBASE_COMPONENTS_NAME';
import { firebaseServerActionsContext, FirebaseServerStorageService } from '@dereekb/firebase-server';
import { Module } from "@nestjs/common";
import { APP_CODE_PREFIXApiAuthService } from './auth.service';
import { APP_CODE_PREFIXFirebaseServerActionsContext } from './action.context';
import { APP_CODE_PREFIXApiStorageModule } from './storage.module';
import { APP_CODE_PREFIXApiAuthModule } from './auth.module';

const APP_CODE_PREFIX_LOWERFirebaseServerActionsContextFactory = (collections: APP_CODE_PREFIXFirestoreCollections, authService: APP_CODE_PREFIXApiAuthService, storageService: FirebaseServerStorageService): APP_CODE_PREFIXFirebaseServerActionsContext => {
  return {
    ...collections,
    ...firebaseServerActionsContext(),
    authService,
    storageService
  };
}

@Module({
  imports: [APP_CODE_PREFIXApiFirestoreModule, APP_CODE_PREFIXApiAuthModule, APP_CODE_PREFIXApiStorageModule],
  providers: [{
    provide: APP_CODE_PREFIXFirebaseServerActionsContext,
    useFactory: APP_CODE_PREFIX_LOWERFirebaseServerActionsContextFactory,
    inject: [APP_CODE_PREFIXFirestoreCollections, APP_CODE_PREFIXApiAuthService, FirebaseServerStorageService]
  }],
  exports: [APP_CODE_PREFIXFirebaseServerActionsContext]
})
export class APP_CODE_PREFIXApiActionModule { }
