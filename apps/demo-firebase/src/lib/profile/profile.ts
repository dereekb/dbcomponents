import { AbstractFirestoreDocument, makeSnapshotConverterFunctions, firestoreUID, firestoreString, firestoreDate, makeFirestoreCollection, FirestoreDocumentDataAccessor, FirestoreCollection, UserRelated, FirestoreDocumentReference } from "@dereekb/firebase";
import { Firestore, CollectionReference, collection } from "firebase/firestore";

export interface Profile extends UserRelated {
  /**
   * Unique username
   */
  username: string;
  /**
   * Last date the profile was updated at.
   */
  updatedAt: Date;
}

export interface ProfileRef extends FirestoreDocumentReference<Profile> { }

export class ProfileDocument extends AbstractFirestoreDocument<Profile, ProfileDocument> { }

export const profileCollectionPath = 'profile';

export const profileConverter = makeSnapshotConverterFunctions<Profile>({
  fields: {
    uid: firestoreUID(),
    username: firestoreString({}),
    updatedAt: firestoreDate({ saveDefaultAsNow: true })
  }
});

export function profileCollectionReference(firestore: Firestore): CollectionReference<Profile> {
  return collection(firestore, profileCollectionPath).withConverter<Profile>(profileConverter);
}

export type ProfileFirestoreCollection = FirestoreCollection<Profile, ProfileDocument>;

export function profileFirestoreCollection(firestore: Firestore): ProfileFirestoreCollection {
  return makeFirestoreCollection({
    itemsPerPage: 50,
    collection: profileCollectionReference(firestore),
    makeDocument: (accessor, documentAccessor) => new ProfileDocument(accessor, documentAccessor)
  });
}
