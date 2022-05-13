import { testWithMockItemFixture } from "@dereekb/firebase";
import { adminFirestoreFactory } from "./firestore.admin";

/**
 * Convenience mock instance for tests within an authorized context.
 * 
 * Uses @google-cloud/firestore
 */
export const adminTestWithMockItemCollection = testWithMockItemFixture()(adminFirestoreFactory);
