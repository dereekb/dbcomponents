import { APP_CODE_PREFIX_LOWERUpdateModel } from './function/model/update.function';
import { exampleSetUsernameKey } from 'FIREBASE_COMPONENTS_NAME';
import { NestAppPromiseGetter, nestServerInstance, UPDATE_MODEL_APP_FUNCTION_KEY } from '@dereekb/firebase-server';
import { APP_CODE_PREFIXApiAppModule } from './app.module';
import { exampleSetUsername } from './function';

export const {
  initNestServer
} = nestServerInstance({ moduleClass: APP_CODE_PREFIXApiAppModule });

export function allAppFunctions(nest: NestAppPromiseGetter) {
  return {
    // Events
    // ---
    // Auth
    // Model
    [UPDATE_MODEL_APP_FUNCTION_KEY]: APP_CODE_PREFIX_LOWERUpdateModel(nest),
    // API Calls
    // Example
    [exampleSetUsernameKey]: exampleSetUsername(nest)
  };
}
