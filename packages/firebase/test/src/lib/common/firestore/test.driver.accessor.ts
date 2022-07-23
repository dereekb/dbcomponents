import { itShouldFail, expectFail } from '@dereekb/util/test';
import { firstValueFrom } from 'rxjs';
import { SubscriptionObject } from '@dereekb/rxjs';
import { Transaction, DocumentReference, WriteBatch, FirestoreDocumentAccessor, makeDocuments, FirestoreDocumentDataAccessor, FirestoreContext, FirestoreDocument, RunTransaction, FirebaseAuthUserId, DocumentSnapshot, FirestoreDataConverter, getDocumentSnapshotPairs, useDocumentSnapshot, useDocumentSnapshotData } from '@dereekb/firebase';
import { MockItemCollectionFixture, MockItemDocument, MockItem, MockItemPrivateDocument, MockItemPrivateFirestoreCollection, MockItemPrivate, MockItemSubItem, MockItemSubItemDocument, MockItemSubItemFirestoreCollection, MockItemSubItemFirestoreCollectionGroup, MockItemUserFirestoreCollection, MockItemUserDocument, MockItemUser, mockItemConverter } from '../mock';
import { Getter } from '@dereekb/util';

/**
 * Describes accessor driver tests, using a MockItemCollectionFixture.
 *
 * @param f
 */
export function describeFirestoreAccessorDriverTests(f: MockItemCollectionFixture) {
  describe('FirestoreAccessorDriver', () => {
    const testDocumentCount = 5;

    let mockItemFirestoreDocumentAccessor: FirestoreDocumentAccessor<MockItem, MockItemDocument>;
    let items: MockItemDocument[];

    beforeEach(async () => {
      mockItemFirestoreDocumentAccessor = f.instance.firestoreCollection.documentAccessor();
      items = await makeDocuments(f.instance.firestoreCollection.documentAccessor(), {
        count: testDocumentCount,
        init: (i) => {
          return {
            value: `${i}`,
            test: true,
            string: ''
          };
        }
      });
    });

    describe('MockItem', () => {
      let itemDocument: MockItemDocument;
      let accessor: FirestoreDocumentDataAccessor<MockItem>;

      beforeEach(() => {
        itemDocument = items[0];
        accessor = itemDocument.accessor;
      });

      describe('accessors', () => {
        describeFirestoreDocumentAccessorTests<MockItem>(() => ({
          context: f.parent.firestoreContext,
          firestoreDocument: () => itemDocument,
          dataForUpdate: () => ({ test: false }),
          hasDataFromUpdate: (data) => data.test === false,
          loadDocumentForTransaction: (transaction, ref) => f.instance.firestoreCollection.documentAccessorForTransaction(transaction).loadDocument(ref!),
          loadDocumentForWriteBatch: (writeBatch, ref) => f.instance.firestoreCollection.documentAccessorForWriteBatch(writeBatch).loadDocument(ref!)
        }));
      });

      describe('Subcollections', () => {
        describe('singleItemFirestoreCollection (MockItemUser)', () => {
          let testUserId: FirebaseAuthUserId;
          let mockItemUserFirestoreCollection: MockItemUserFirestoreCollection;
          let itemUserDataDocument: MockItemUserDocument;
          let userDataAccessor: FirestoreDocumentDataAccessor<MockItemUser>;

          beforeEach(() => {
            testUserId = 'userid' + Math.ceil(Math.random() * 100000);
            mockItemUserFirestoreCollection = f.instance.collections.mockItemUserCollectionFactory(itemDocument);
            itemUserDataDocument = mockItemUserFirestoreCollection.documentAccessor().loadDocumentForId(testUserId);
            userDataAccessor = itemUserDataDocument.accessor;
          });

          describe('create()', () => {
            describe('mockItemUserAccessorFactory usage', () => {
              it('should copy the documents identifier to the uid field on create.', async () => {
                await itemUserDataDocument.accessor.create({
                  uid: '', // the mockItemUserAccessorFactory silently enforces the uid to be the same as the document.
                  name: 'hello'
                });

                const snapshot = await itemUserDataDocument.accessor.get();
                expect(snapshot.data()?.uid).toBe(testUserId);
              });
            });
          });

          describe('set()', () => {
            describe('mockItemUserAccessorFactory usage', () => {
              it('should copy the documents identifier to the uid field on set.', async () => {
                await itemUserDataDocument.accessor.set({
                  uid: '', // the mockItemUserAccessorFactory silently enforces the uid to be the same as the document.
                  name: 'hello'
                });

                const snapshot = await itemUserDataDocument.accessor.get();
                expect(snapshot.data()?.uid).toBe(testUserId);
              });
            });
          });
        });

        describe('singleItemFirestoreCollection (MockItemPrivate)', () => {
          let mockItemPrivateFirestoreCollection: MockItemPrivateFirestoreCollection;
          let itemPrivateDataDocument: MockItemPrivateDocument;
          let privateDataAccessor: FirestoreDocumentDataAccessor<MockItemPrivate>;
          let privateSub: SubscriptionObject;

          beforeEach(() => {
            mockItemPrivateFirestoreCollection = f.instance.collections.mockItemPrivateCollectionFactory(itemDocument);
            itemPrivateDataDocument = mockItemPrivateFirestoreCollection.loadDocument();
            privateDataAccessor = itemPrivateDataDocument.accessor;
            privateSub = new SubscriptionObject();
          });

          afterEach(() => {
            privateSub.destroy();
          });

          describe('singleItemFirestoreCollection accessor', () => {
            it('should implement FirestoreSingleDocumentAccessor', () => {
              expect(mockItemPrivateFirestoreCollection.singleItemIdentifier).toBeDefined();
              expect(mockItemPrivateFirestoreCollection.loadDocument).toBeDefined();
              expect(mockItemPrivateFirestoreCollection.loadDocumentForTransaction).toBeDefined();
              expect(mockItemPrivateFirestoreCollection.loadDocumentForWriteBatch).toBeDefined();
            });
          });

          describe('get()', () => {
            it('should read that data using the configured converter', async () => {
              await itemPrivateDataDocument.accessor.set({ values: null } as any);
              const dataWithoutConverter: any = (await itemPrivateDataDocument.accessor.getWithConverter(null)).data();

              expect(dataWithoutConverter).toBeDefined();
              expect(dataWithoutConverter.values).toBeNull();

              // converter on client, _converter on server
              expect((itemPrivateDataDocument.documentRef as any).converter ?? (itemPrivateDataDocument.documentRef as any)._converter).toBeDefined();

              const data = await itemPrivateDataDocument.snapshotData();
              expect(data?.values).toBeDefined();
              expect(data?.values).not.toBeNull(); // should not be null due to the snapshot converter config
            });
          });

          describe('getWithConverter()', () => {
            it('should get the results with the input converter', async () => {
              await itemPrivateDataDocument.accessor.set({ values: null } as any);

              const data = await itemPrivateDataDocument.snapshotData();
              expect(data?.values).toBeDefined();

              const dataWithoutConverter: any = (await itemPrivateDataDocument.accessor.getWithConverter(null)).data();

              expect(dataWithoutConverter).toBeDefined();
              expect(dataWithoutConverter.values).toBeNull();
            });

            it('should get the results with the input converter with a type', async () => {
              await itemPrivateDataDocument.accessor.set({ values: null } as any);

              const data = await itemPrivateDataDocument.snapshotData();
              expect(data?.values).toBeDefined();

              const converter: FirestoreDataConverter<MockItem> = mockItemConverter;
              const dataWithoutConverter: DocumentSnapshot<MockItem> = await itemPrivateDataDocument.accessor.getWithConverter(converter);

              expect(dataWithoutConverter).toBeDefined();
            });
          });

          describe('update()', () => {
            itShouldFail('if the item does not exist', async () => {
              const exists = await itemPrivateDataDocument.accessor.exists();
              expect(exists).toBe(false);
              await expectFail(() => itemPrivateDataDocument.update({ createdAt: new Date() }));
            });

            it('should update the item if it exist', async () => {
              await itemPrivateDataDocument.create({
                createdAt: new Date(),
                values: []
              });

              const newDate = new Date(0);

              const exists = await itemPrivateDataDocument.accessor.exists();
              expect(exists).toBe(true);

              await itemPrivateDataDocument.update({ createdAt: newDate });

              const data = await itemPrivateDataDocument.snapshotData();
              expect(data?.createdAt.getTime()).toBe(0);
            });
          });

          describe('set()', () => {
            it('should create the item', async () => {
              let exists = await privateDataAccessor.exists();
              expect(exists).toBe(false);

              await privateDataAccessor.set({ values: [], createdAt: new Date() });

              exists = await privateDataAccessor.exists();
              expect(exists).toBe(true);
            });
          });

          describe('with item', () => {
            beforeEach(async () => {
              await privateDataAccessor.set({ values: [], createdAt: new Date() });
            });

            describe('accessors', () => {
              const TEST_COMMENTS = 'test';

              describeFirestoreDocumentAccessorTests<MockItemPrivate>(() => ({
                context: f.parent.firestoreContext,
                firestoreDocument: () => itemPrivateDataDocument,
                dataForUpdate: () => ({ comments: TEST_COMMENTS }),
                hasDataFromUpdate: (data) => data.comments === TEST_COMMENTS,
                loadDocumentForTransaction: (transaction, ref) => mockItemPrivateFirestoreCollection.loadDocumentForTransaction(transaction),
                loadDocumentForWriteBatch: (writeBatch, ref) => mockItemPrivateFirestoreCollection.loadDocumentForWriteBatch(writeBatch)
              }));
            });
          });
        });

        describe('MockItemSubItem', () => {
          let subItemDocument: MockItemSubItemDocument;

          beforeEach(async () => {
            subItemDocument = f.instance.collections.mockItemSubItemCollectionFactory(itemDocument).documentAccessor().newDocument();
            await subItemDocument.accessor.set({ value: 0 });
          });

          describe('firestoreCollectionWithParent (MockItemSubItem)', () => {
            let mockItemSubItemFirestoreCollection: MockItemSubItemFirestoreCollection;

            beforeEach(() => {
              mockItemSubItemFirestoreCollection = f.instance.collections.mockItemSubItemCollectionFactory(itemDocument);
            });

            describe('with item', () => {
              describe('accessors', () => {
                const TEST_VALUE = 1234;

                describeFirestoreDocumentAccessorTests<MockItemSubItem>(() => ({
                  context: f.parent.firestoreContext,
                  firestoreDocument: () => subItemDocument,
                  dataForUpdate: () => ({ value: TEST_VALUE }),
                  hasDataFromUpdate: (data) => data.value === TEST_VALUE,
                  loadDocumentForTransaction: (transaction, ref) => mockItemSubItemFirestoreCollection.documentAccessorForTransaction(transaction).loadDocument(ref!),
                  loadDocumentForWriteBatch: (writeBatch, ref) => mockItemSubItemFirestoreCollection.documentAccessorForWriteBatch(writeBatch).loadDocument(ref!)
                }));
              });
            });
          });

          describe('firestoreCollectionGroup (MockItemSubItem)', () => {
            let mockItemSubItemFirestoreCollectionGroup: MockItemSubItemFirestoreCollectionGroup;

            beforeEach(() => {
              mockItemSubItemFirestoreCollectionGroup = f.instance.collections.mockItemSubItemCollectionGroup;
            });

            describe('with item', () => {
              describe('accessors', () => {
                const TEST_VALUE = 1234;

                describeFirestoreDocumentAccessorTests<MockItemSubItem>(() => ({
                  context: f.parent.firestoreContext,
                  firestoreDocument: () => subItemDocument,
                  dataForUpdate: () => ({ value: TEST_VALUE }),
                  hasDataFromUpdate: (data) => data.value === TEST_VALUE,
                  loadDocumentForTransaction: (transaction, ref) => mockItemSubItemFirestoreCollectionGroup.documentAccessorForTransaction(transaction).loadDocument(ref!),
                  loadDocumentForWriteBatch: (writeBatch, ref) => mockItemSubItemFirestoreCollectionGroup.documentAccessorForWriteBatch(writeBatch).loadDocument(ref!)
                }));
              });
            });
          });
        });
      });
    });

    describe('documentAccessor()', () => {
      describe('loadDocumentForKey()', () => {
        it('should load an existing document from the path.', async () => {
          const document = mockItemFirestoreDocumentAccessor.loadDocumentForKey(items[0].key);
          const exists = await document.accessor.exists();

          expect(exists).toBe(true);
        });

        itShouldFail('if the path is invalid (points to collection)', () => {
          expectFail(() => {
            mockItemFirestoreDocumentAccessor.loadDocumentForKey('path');
          });
        });

        itShouldFail('if the path points to a different type/collection', () => {
          expectFail(() => {
            mockItemFirestoreDocumentAccessor.loadDocumentForKey('path/id');
          });
        });

        itShouldFail('if the path is empty.', () => {
          expectFail(() => {
            mockItemFirestoreDocumentAccessor.loadDocumentForKey('');
          });
        });

        itShouldFail('if the path is undefined.', () => {
          expectFail(() => {
            mockItemFirestoreDocumentAccessor.loadDocumentForKey(undefined as any);
          });
        });

        itShouldFail('if the path is null.', () => {
          expectFail(() => {
            mockItemFirestoreDocumentAccessor.loadDocumentForKey(null as any);
          });
        });
      });

      describe('loadDocumentForId()', () => {
        it('should return a document with the given id.', () => {
          const document = mockItemFirestoreDocumentAccessor.loadDocumentForId('id');
          expect(document).toBeDefined();
        });

        itShouldFail('if the id is empty.', () => {
          expectFail(() => {
            mockItemFirestoreDocumentAccessor.loadDocumentForId('');
          });
        });

        itShouldFail('if the id is undefined.', () => {
          expectFail(() => {
            mockItemFirestoreDocumentAccessor.loadDocumentForId(undefined as any);
          });
        });
      });
    });
  });
}

export interface DescribeAccessorTests<T> {
  context: FirestoreContext;
  firestoreDocument: Getter<FirestoreDocument<T>>;
  dataForUpdate: () => Partial<T>;
  hasDataFromUpdate: (data: T) => boolean;
  loadDocumentForTransaction: (transaction: Transaction, ref?: DocumentReference<T>) => FirestoreDocument<T>;
  loadDocumentForWriteBatch: (writeBatch: WriteBatch, ref?: DocumentReference<T>) => FirestoreDocument<T>;
}

export function describeFirestoreDocumentAccessorTests<T>(init: () => DescribeAccessorTests<T>) {
  let c: DescribeAccessorTests<T>;
  let sub: SubscriptionObject;
  let firestoreDocument: FirestoreDocument<T>;
  let accessor: FirestoreDocumentDataAccessor<T>;

  beforeEach(() => {
    sub = new SubscriptionObject();
    c = init();
    firestoreDocument = c.firestoreDocument();
    accessor = firestoreDocument.accessor;
  });

  afterEach(() => {
    sub.destroy();
  });

  describe('utilities', () => {
    describe('getDocumentSnapshotPairs()', () => {
      it('should return the document and snapshot pairs for the input.', async () => {
        const pairs = await getDocumentSnapshotPairs([firestoreDocument]);

        expect(pairs.length).toBe(1);
        expect(pairs[0]).toBeDefined();
        expect(pairs[0].document).toBe(firestoreDocument);
        expect(pairs[0].snapshot).toBeDefined();
        expect(pairs[0].snapshot.data()).toBeDefined();
      });
    });

    describe('useDocumentSnapshot()', () => {
      it(`should use the input document value if it exists`, async () => {
        const exists = await firestoreDocument.exists();
        expect(exists).toBe(true);

        let snapshotUsed = false;

        await useDocumentSnapshot(firestoreDocument, (snapshot) => {
          expect(snapshot).toBeDefined();
          snapshotUsed = true;
        });

        expect(snapshotUsed).toBe(true);
      });

      it(`should not use the input undefined value`, async () => {
        let snapshotUsed = false;

        await useDocumentSnapshot(undefined, (snapshot) => {
          expect(snapshot).toBeDefined();
          snapshotUsed = true;
        });

        expect(snapshotUsed).toBe(false);
      });
    });

    describe('useDocumentSnapshotData()', () => {
      it(`should use the input document's snapshot data if it exists`, async () => {
        const exists = await firestoreDocument.exists();
        expect(exists).toBe(true);

        let snapshotUsed = false;

        await useDocumentSnapshotData(firestoreDocument, (data) => {
          expect(data).toBeDefined();
          snapshotUsed = true;
        });

        expect(snapshotUsed).toBe(true);
      });
    });
  });

  describe('AbstractFirestoreDocument', () => {
    describe('snapshot()', () => {
      it('should return the snapshot.', async () => {
        const snapshot = await firestoreDocument.snapshot();
        expect(snapshot).toBeDefined();
      });
    });

    describe('snapshotData()', () => {
      it('should return the snapshot data if the model exists.', async () => {
        const exists = await firestoreDocument.exists();
        expect(exists).toBe(true);

        const data = await firestoreDocument.snapshotData();
        expect(data).toBeDefined();
      });

      it('should return the undefined if the model does not exist.', async () => {
        await accessor.delete();

        const exists = await firestoreDocument.exists();
        expect(exists).toBe(false);

        const data = await firestoreDocument.snapshotData();
        expect(data).toBeUndefined();
      });
    });

    describe('create()', () => {
      it('should create the document if it does not exist.', async () => {
        const snapshot = await firestoreDocument.snapshot();

        await accessor.delete();

        let exists = await firestoreDocument.exists();
        expect(exists).toBe(false);

        await firestoreDocument.create(snapshot.data() as T);

        exists = await firestoreDocument.exists();
        expect(exists).toBe(true);
      });

      itShouldFail('if the document exists.', async () => {
        const snapshot = await firestoreDocument.snapshot();

        const exists = await firestoreDocument.exists();
        expect(exists).toBe(true);

        await expectFail(() => firestoreDocument.create(snapshot.data() as T));
      });
    });

    describe('update()', () => {
      it('should update the data if the document exists.', async () => {
        const data = c.dataForUpdate();
        await firestoreDocument.update(data);

        const snapshot = await firestoreDocument.snapshot();
        expect(c.hasDataFromUpdate(snapshot.data() as T)).toBe(true);
      });

      itShouldFail('if the document does not exist.', async () => {
        await accessor.delete();

        const snapshot = await firestoreDocument.snapshot();
        expect(snapshot.data()).toBe(undefined);

        const exists = await firestoreDocument.exists();
        expect(exists).toBe(false);

        await expectFail(() => firestoreDocument.update(c.dataForUpdate()));
      });

      it('should not throw an error if the input update data is empty.', async () => {
        await firestoreDocument.update({});
      });
    });

    describe('transaction', () => {
      describe('update()', () => {
        it('should update the data if the document exists.', async () => {
          await c.context.runTransaction(async (transaction) => {
            const transactionDocument = await c.loadDocumentForTransaction(transaction, firestoreDocument.documentRef);

            const currentData = await transactionDocument.snapshotData();
            expect(currentData).toBeDefined();

            const data = c.dataForUpdate();
            await transactionDocument.update(data);
          });

          const snapshot = await firestoreDocument.snapshot();
          expect(c.hasDataFromUpdate(snapshot.data() as T)).toBe(true);
        });
      });
    });

    describe('write batch', () => {
      describe('update()', () => {
        it('should update the data if the document exists.', async () => {
          const batch = c.context.batch();
          const batchDocument = await c.loadDocumentForWriteBatch(batch, firestoreDocument.documentRef);

          const data = c.dataForUpdate();
          await batchDocument.update(data);

          await batch.commit();

          const snapshot = await firestoreDocument.snapshot();
          expect(c.hasDataFromUpdate(snapshot.data() as T)).toBe(true);
        });
      });
    });
  });

  describe('accessor', () => {
    describe('stream()', () => {
      it('should return a snapshot stream', async () => {
        const result = await accessor.stream();
        expect(result).toBeDefined();
      });

      it('should emit values on updates from the observable.', (done) => {
        let count = 0;

        sub.subscription = accessor.stream().subscribe((item) => {
          count += 1;

          if (count === 1) {
            expect(c.hasDataFromUpdate(item.data() as T)).toBe(false);
          } else if (count === 2) {
            expect(c.hasDataFromUpdate(item.data() as T)).toBe(true);
            done();
          }
        });

        setTimeout(() => {
          accessor.update(c.dataForUpdate());
        }, 100);
      });

      describe('in transition context', () => {
        let runTransaction: RunTransaction;

        beforeEach(() => {
          runTransaction = c.context.runTransaction;
        });

        it('should return the first emitted value (observable completes immediately)', async () => {
          await runTransaction(async (transaction) => {
            const transactionItemDocument = c.loadDocumentForTransaction(transaction, accessor.documentRef);

            // load the value
            const value = await firstValueFrom(transactionItemDocument.accessor.stream());

            expect(value).toBeDefined();

            // set to make the transaction valid
            await transactionItemDocument.accessor.set({ value: 0 } as any, { merge: true });

            return value;
          });
        });
      });

      describe('in batch context', () => {
        it('should return the first emitted value (observable completes immediately)', async () => {
          const writeBatch: WriteBatch = c.context.batch();
          const batchItemDocument = c.loadDocumentForWriteBatch(writeBatch, accessor.documentRef);

          // load the value
          const value = await firstValueFrom(batchItemDocument.accessor.stream());

          expect(value).toBeDefined();

          // set to make the batch changes valid
          await batchItemDocument.accessor.set({ value: 0 } as any, { merge: true });

          // commit the changes
          await writeBatch.commit();
        });
      });
    });

    describe('create()', () => {
      it('should create the document if it does not exist.', async () => {
        const snapshot = await accessor.get();

        await accessor.delete();

        let exists = await accessor.exists();
        expect(exists).toBe(false);

        await accessor.create(snapshot.data() as T);

        exists = await accessor.exists();
        expect(exists).toBe(true);
      });

      itShouldFail('if the document exists.', async () => {
        const snapshot = await accessor.get();

        const exists = await accessor.exists();
        expect(exists).toBe(true);

        await expectFail(() => accessor.create(snapshot.data() as T));
      });
    });

    describe('get()', () => {
      it('should return a snapshot', async () => {
        const result = await accessor.get();
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
      });
    });

    describe('exists()', () => {
      it('should return true if the document exists', async () => {
        const exists = await accessor.exists();
        expect(exists).toBe(true);
      });

      it('should return false if the document does not exist', async () => {
        await accessor.delete();
        const exists = await accessor.exists();
        expect(exists).toBe(false);
      });
    });

    describe('update()', () => {
      it('should update the data if the document exists.', async () => {
        const data = c.dataForUpdate();
        await accessor.update(data);

        const snapshot = await accessor.get();
        expect(c.hasDataFromUpdate(snapshot.data() as T)).toBe(true);
      });

      itShouldFail('if the document does not exist.', async () => {
        await accessor.delete();

        const snapshot = await accessor.get();
        expect(snapshot.data()).toBe(undefined);

        const exists = await accessor.exists();
        expect(exists).toBe(false);

        await expectFail(() => accessor.update(c.dataForUpdate()));
      });

      itShouldFail('if the input is an empty object.', async () => {
        await expectFail(() => accessor.update({}));
      });

      // todo: test that update does not call the converter when setting values.
    });

    describe('set()', () => {
      it('should create the object if it does not exist.', async () => {
        await accessor.delete();

        let exists = await accessor.exists();
        expect(exists).toBe(false);

        const data = c.dataForUpdate();
        await accessor.set(data as T);

        exists = await accessor.exists();
        expect(exists).toBe(true);

        const snapshot = await accessor.get();
        expect(c.hasDataFromUpdate(snapshot.data() as T)).toBe(true);
      });

      it('should update the data on the document for fields that are not undefined.', async () => {
        const data = c.dataForUpdate();
        await accessor.set(data as T);
        const snapshot = await accessor.get();
        expect(c.hasDataFromUpdate(snapshot.data() as T)).toBe(true);
      });

      describe('merge=true', () => {
        it('should update the data if the document exists.', async () => {
          const data = c.dataForUpdate();
          await accessor.set(data, { merge: true });

          const snapshot = await accessor.get();
          expect(c.hasDataFromUpdate(snapshot.data() as T)).toBe(true);
        });

        it('should succeed if the document does not exist.', async () => {
          await accessor.delete();

          let snapshot = await accessor.get();
          expect(snapshot.data()).toBe(undefined);

          const exists = await accessor.exists();
          expect(exists).toBe(false);

          await accessor.set(c.dataForUpdate(), { merge: true });

          snapshot = await accessor.get();
          expect(c.hasDataFromUpdate(snapshot.data() as T)).toBe(true);
        });
      });

      // todo: test that set calls the converter when setting values.
    });

    describe('delete()', () => {
      it('should delete the document.', async () => {
        await accessor.delete();

        const snapshot = await accessor.get();
        expect(snapshot.data()).toBe(undefined);

        const exists = await accessor.exists();
        expect(exists).toBe(false);
      });
    });
  });
}
