import { Firestore, runTransaction } from '@firebase/firestore';
import { doc, collection, writeBatch, Transaction } from "firebase/firestore";
import { FirestoreAccessorDriver } from "../../common/firestore/driver/accessor";
import { TransactionFunction } from '../../common/firestore/driver';
import { writeBatchDocumentContext } from "./driver.accessor.batch";
import { defaultFirestoreDocumentContext } from "./driver.accessor.default";
import { transactionDocumentContext } from "./driver.accessor.transaction";

export function firestoreClientAccessorDriver(): FirestoreAccessorDriver {
  return {
    doc: doc as any,  // typing issue. Override with any.
    collection: collection as any,
    subcollection: collection as any,
    transactionFactoryForFirestore: (firestore) => async <T>(fn: TransactionFunction<T>) => await runTransaction(firestore as Firestore, fn as (transaction: Transaction) => Promise<T>),
    writeBatchFactoryForFirestore: (firestore) => () => writeBatch(firestore as Firestore),
    defaultContextFactory: defaultFirestoreDocumentContext,
    transactionContextFactory: transactionDocumentContext as any,
    writeBatchContextFactory: writeBatchDocumentContext as any
  };
}
