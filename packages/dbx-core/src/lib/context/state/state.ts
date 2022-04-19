import * as fromDbxContext from './reducer';

/**
 * Type that contains the dbx-core contextual ngrx state information.
 * 
 * This is the "full state" of our DbxAppContext. It is the sum of the fromDbxContext.State interface.
 * 
 * Sub-state types that need to be aware of this typeing may extend (via union) this type.
 */
export type DbxAppContextFullState = fromDbxContext.State;
