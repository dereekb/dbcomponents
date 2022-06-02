import { serverError } from '@dereekb/util';
import { FirestoreCollectionName, FirestoreModelIdentity, FirestoreModelNames, OnCallUpdateModelParams } from '@dereekb/firebase';
import { badRequestError } from '../../function';
import { CallableContextWithAuthData } from '../../function/context';
import { OnCallWithAuthorizedNestContext } from '../function/v1/call.utility';

export type OnCallUpdateModelFunction<C, I = unknown, O = void> = (nest: C, requestData: I, context: CallableContextWithAuthData) => O;

export type OnCallUpdateModelMap<C, T extends FirestoreModelIdentity = FirestoreModelIdentity> = {
  [K in FirestoreModelNames<T>]?: OnCallUpdateModelFunction<C, any, any>;
};

/**
 * Creates a OnCallWithAuthorizedNestContext function for updating model params.
 *
 * @param map
 * @returns
 */
export function onCallUpdateModel<C>(map: OnCallUpdateModelMap<C>): OnCallWithAuthorizedNestContext<C, OnCallUpdateModelParams, unknown> {
  return <I>(nest: C, requestData: OnCallUpdateModelParams<I>, context: CallableContextWithAuthData) => {
    const modelType = requestData?.modelType as string;
    const updateFn = map[modelType];

    if (updateFn) {
      return updateFn(nest, requestData.data, context);
    } else {
      throw updateModelUnknownModelTypeError(modelType);
    }
  };
}

export function updateModelUnknownModelTypeError(modelType: FirestoreCollectionName) {
  return badRequestError(
    serverError({
      status: 400,
      code: 'UNKNOWN_TYPE_ERROR',
      message: 'Invalid type to update.',
      data: {
        modelType
      }
    })
  );
}
