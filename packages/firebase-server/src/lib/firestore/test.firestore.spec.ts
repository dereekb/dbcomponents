import { DocumentSnapshot, DocumentReference, Transaction, Firestore } from '@google-cloud/firestore';
import { MockItem, testItemCollectionReference, MockItemDocument, MockItemFirestoreCollection, testItemFirestoreCollection, authorizedTestWithMockItemCollection, FirestoreDocumentContext, makeFirestoreCollection } from "@dereekb/firebase";
import { transactionDocumentContext } from './driver.accessor.transaction';
import { Maybe } from '@dereekb/util';
import { adminTestWithMockItemCollection } from '../../test/firestore.fixture.admin';
import { googleCloudFirestoreDrivers } from './driver';

describe('FirestoreCollection', () => {

  adminTestWithMockItemCollection((f) => {

    let firestore: Firestore;
    let firestoreCollection: MockItemFirestoreCollection;

    beforeEach(async () => {
      firestore = f.parent.firestore;
    });

    describe('makeFirestoreCollection()', () => {

      it('should create a new collection.', () => {
        const itemsPerPage = 50;

        firestoreCollection = makeFirestoreCollection({
          itemsPerPage,
          collection: testItemCollectionReference(f.parent.context),
          makeDocument: (a, d) => new MockItemDocument(a, d),
          ...googleCloudFirestoreDrivers()
        });

        expect(firestoreCollection).toBeDefined();
        expect(firestoreCollection.config.itemsPerPage).toBe(itemsPerPage);
      });

    });

    beforeEach(async () => {
      firestoreCollection = testItemFirestoreCollection(f.parent.context);
    });

    describe('documentAccessor()', () => {

      it('should create a new document accessor instance when no context is passed.', () => {
        const result = firestoreCollection.documentAccessor();
        expect(result).toBeDefined();
      });

      it('should create a new document accessor instance that uses the passed context.', async () => {

        let ref: Maybe<DocumentReference<MockItem>>;

        await firestore.runTransaction(async (transaction: Transaction) => {

          const context: FirestoreDocumentContext<MockItem> = transactionDocumentContext(transaction);
          const result = firestoreCollection.documentAccessor(context);
          expect(result).toBeDefined();

          const document = result.newDocument();
          ref = document.documentRef as DocumentReference<MockItem>;

          expect(document.documentRef).toBeDefined();
          expect(document.accessor).toBeDefined();

          await document.accessor.set({ test: true });
        });

        expect(ref).toBeDefined();

        const loadedDoc = firestoreCollection.documentAccessor().loadDocument(ref!);
        const loadedData: DocumentSnapshot<MockItem> = await loadedDoc.accessor.get() as DocumentSnapshot<MockItem>;

        expect(loadedData.exists).toBe(true);
      });

    });

  });

});
