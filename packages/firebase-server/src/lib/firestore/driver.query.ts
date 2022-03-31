import { DocumentSnapshot, Query as GoogleCloudQuery } from "@google-cloud/firestore";
import { Query, FIRESTORE_LIMIT_QUERY_CONSTRAINT_TYPE, FIRESTORE_START_AT_QUERY_CONSTRAINT_TYPE, FullFirestoreQueryConstraintHandlersMapping, makeFirestoreQueryConstraintFunctionsDriver, QuerySnapshot, FirestoreQueryConstraintFunctionsDriver, FirestoreQueryDriver } from "@dereekb/firebase";

export type FirestoreServerQueryBuilder<T = any> = GoogleCloudQuery<T>;

export const FIRESTORE_CLIENT_QUERY_CONSTRAINT_HANDLER_MAPPING: FullFirestoreQueryConstraintHandlersMapping<FirestoreServerQueryBuilder> = {
  [FIRESTORE_LIMIT_QUERY_CONSTRAINT_TYPE]: (builder, data) => builder.limit(data.limit),
  [FIRESTORE_START_AT_QUERY_CONSTRAINT_TYPE]: (builder, data) => builder.startAt(data.snapshot as DocumentSnapshot)
};

export function firestoreClientQueryConstraintFunctionsDriver(): FirestoreQueryConstraintFunctionsDriver {
  return makeFirestoreQueryConstraintFunctionsDriver<FirestoreServerQueryBuilder>({
    mapping: FIRESTORE_CLIENT_QUERY_CONSTRAINT_HANDLER_MAPPING,
    init: <T>(query: Query<T>) => query as FirestoreServerQueryBuilder<T>,
    build: <T>(query: FirestoreServerQueryBuilder<T>) => query
  });
}

export function firestoreClientQueryDriver(): FirestoreQueryDriver {
  return {
    ...firestoreClientQueryConstraintFunctionsDriver(),
    getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>> {
      return (query as FirestoreServerQueryBuilder<T>).get();
    }
  };
}
