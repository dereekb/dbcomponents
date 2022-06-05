import { createGuestbook } from './../guestbook/guestbook.crud';
import { updateProfile } from '../profile/profile.update';
import { updateGuestbookEntry } from '../guestbook/guestbookentry.update';
import { inAuthContext, onCallCreateModel, onCallDeleteModel, onCallUpdateModel } from '@dereekb/firebase-server';
import { DemoOnCallCreateModelMap, DemoOnCallDeleteModelMap, DemoOnCallUpdateModelMap, onCallWithDemoNestContext } from '../function';

// MARK: Create
export const demoCreateModelMap: DemoOnCallCreateModelMap = {
  guestbook: createGuestbook
};
export const demoCreateModel = onCallWithDemoNestContext(inAuthContext(onCallCreateModel(demoCreateModelMap)));

// MARK: Update
export const demoUpdateModelMap: DemoOnCallUpdateModelMap = {
  guestbookEntry: updateGuestbookEntry,
  profile: updateProfile
};
export const demoUpdateModel = onCallWithDemoNestContext(inAuthContext(onCallUpdateModel(demoUpdateModelMap)));

// MARK: Delete
export const demoDeleteModelMap: DemoOnCallDeleteModelMap = {};
export const demoDeleteModel = onCallWithDemoNestContext(inAuthContext(onCallDeleteModel(demoDeleteModelMap)));
