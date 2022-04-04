import { FirestoreContext } from "./context";
import { CollectionReference, DocumentReference, Firestore } from "./types";

/**
 * Contains a reference to a CollectionReference.
 */
export interface CollectionReferenceRef<T> {
  readonly collection: CollectionReference<T>;
}

/**
 * Contains a reference to a DocumentReference.
 */
export interface DocumentReferenceRef<T> {
  readonly documentRef: DocumentReference<T>;
}

/**
 * Contains a reference to a FirestoreContext.
 */
export interface FirestoreContextReference<F extends Firestore = Firestore> {
  readonly firestoreContext: FirestoreContext<F>;
}
