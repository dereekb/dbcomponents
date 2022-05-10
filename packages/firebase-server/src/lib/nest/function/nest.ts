import { PromiseOrValue, Getter } from '@dereekb/util';
import { INestApplicationContext } from '@nestjs/common';
import * as functions from 'firebase-functions';
import { EventContext, HttpsFunction, Runnable } from 'firebase-functions';
import { RunnableHttpFunction } from '../../function/type';

// MARK: Nest
/**
 * Getter for an INestApplicationContext promise. Nest should be initialized when the promise resolves.
 */
export type NestApplicationPromiseGetter = Getter<Promise<INestApplicationContext>>;

/**
 * Generates a function from the passed NestApplicationPromiseGetter/context.
 * 
 * This pattern is available to allow generating similar content for differenting contexts, such as production and testing.
 */
export type NestApplicationFunctionFactory<F> = (nestAppPromiseGetter: NestApplicationPromiseGetter) => F;

export type NestApplicationRunnableHttpFunctionFactory<I> = NestApplicationFunctionFactory<RunnableHttpFunction<I>>;

/**
 * Runnable function that is passed an INestApplicationContext in addition to the usual data/context provided by firebase.
 */
export type OnCallWithNestApplication<I = any, O = any> = (nest: INestApplicationContext, data: I, context: functions.https.CallableContext) => O;

/**
 * Factory function for generating a NestApplicationFunctionFactory for a HttpsFunctions/Runnable firebase function.
 */
export type OnCallWithNestApplicationFactory = <I, O>(fn: OnCallWithNestApplication<I, O>) => NestApplicationRunnableHttpFunctionFactory<I>;

/**
 * Creates a factory for generating OnCallWithNestApplication functions.
 * 
 * @param nestAppPromiseGetter 
 * @returns 
 */
export function onCallWithNestApplicationFactory(): OnCallWithNestApplicationFactory {
  return <I, O>(fn: OnCallWithNestApplication<I, O>) => {
    return (nestAppPromiseGetter: NestApplicationPromiseGetter) => functions.https.onCall((data: I, context: functions.https.CallableContext) => nestAppPromiseGetter().then(x => fn(x, data, context)));
  };
}

/**
 * Runnable function that is passed an arbitrary nest context object in addition to the usual data/context provided by firebase.
 */
export type OnCallWithNestContext<C, I = any, O = any> = (nestContext: C, data: I, context: functions.https.CallableContext) => O;

/**
 * Factory function for generating HttpsFunctions/Runnable firebase function that returns the value from the input OnCallWithNestContext function.
 */
export type OnCallWithNestContextFactory<C> = <I, O>(fn: OnCallWithNestContext<C, I, O>) => NestApplicationRunnableHttpFunctionFactory<I>;

/**
 * Getter for an INestApplicationContext promise. Nest should be initialized when the promise resolves.
 */
export type MakeNestContext<C> = (nest: INestApplicationContext) => C;

/**
 * Creates a factory for generating OnCallWithNestContext functions with a nest context object that is generated by the input function.
 * 
 * @param appFactory 
 * @param makeNestContext 
 * @returns 
 */
export function onCallWithNestContextFactory<C>(appFactory: OnCallWithNestApplicationFactory, makeNestContext: MakeNestContext<C>): OnCallWithNestContextFactory<C> {
  return <I, O>(fn: OnCallWithNestContext<C, I, O>) => appFactory<I, O>((nest, data, context) => fn(makeNestContext(nest), data, context));
}

/**
 * Abstract class that wraps an INestApplicationContext value.
 */
export abstract class AbstractNestContext {
  constructor(readonly nest: INestApplicationContext) { }
}

// MARK: Event
export type FirestoreEventHandler<I = any, O = any> = (data: I, context: EventContext) => PromiseOrValue<O>;
export type NestApplicationEventHandler<I = any, O = any> = (nest: INestApplicationContext, data: I, context: EventContext) => PromiseOrValue<O>;
export type NestApplicationEventHandlerBuilder<I = any, O = any> = (handler: NestApplicationEventHandler<I, O>) => FirestoreEventHandler<I, O>;

export type OnEventWithNestApplicationBuilder<I = any, O = any> = (nest: NestApplicationEventHandlerBuilder<I, O>) => functions.CloudFunction<O>;

/**
 * Factory function for generating a CloudFunctionHandler via a NestApplicationCloudFunctionHandler.
 */
export type OnEventWithNestApplicationFactory = <I, O>(fn: OnEventWithNestApplicationBuilder<I, O>) => NestApplicationFunctionFactory<functions.CloudFunction<O>>;

/**
 * Creates a factory for generating OnEventWithNestApplicationBuilder values.
 * 
 * @param nestAppPromiseGetter 
 * @returns 
 */
export function onEventWithNestApplicationFactory(): OnEventWithNestApplicationFactory {
  return <I, O>(fn: OnEventWithNestApplicationBuilder<I, O>) => {
    return (nestAppPromiseGetter: NestApplicationPromiseGetter) => {
      const handlerBuilder: NestApplicationEventHandlerBuilder<I, O> = (handler) => {
        const fnHandler: FirestoreEventHandler<I, O> = (data, context) => nestAppPromiseGetter().then(nest => handler(nest, data, context));
        return fnHandler;
      };

      return fn(handlerBuilder);
    };
  };
}

export type NestContextEventHandler<C, I = any, O = any> = (nest: C, data: I, context: EventContext) => Promise<O>;
export type NestContextEventHandlerBuilder<C, I = any, O = any> = (handler: NestContextEventHandler<C, I, O>) => FirestoreEventHandler<I, O>;

/**
 * Runnable function that is passed an arbitrary nest context object in addition to the usual data/context provided by firebase.
 */
export type OnEventWithNestContextBuilder<C, I = any, O = any> = (nest: NestContextEventHandlerBuilder<C, I, O>) => functions.CloudFunction<O>;

/**
 * Factory function for generating a firebase CloudFunction for a specific event.
 */
export type OnEventWithNestContextFactory<C> = <I, O = any>(fn: OnEventWithNestContextBuilder<C, I, O>) => NestApplicationFunctionFactory<functions.CloudFunction<O>>;

/**
 * Creates a factory for generating OnCallWithNestContext functions with a nest context object that is generated by the input function.
 * 
 * @param appFactory 
 * @param makeNestContext 
 * @returns 
 */
export function onEventWithNestContextFactory<C>(makeNestContext: MakeNestContext<C>): OnEventWithNestContextFactory<C> {
  return <I, O = any>(fn: OnEventWithNestContextBuilder<C, I, O>) => {
    return (nestAppPromiseGetter: NestApplicationPromiseGetter) => {
      const handlerBuilder: NestContextEventHandlerBuilder<C, I, O> = (handler) => {
        const fnHandler: FirestoreEventHandler<I, O> = (data, context) => nestAppPromiseGetter().then(nest => handler(makeNestContext(nest), data, context));
        return fnHandler;
      };

      return fn(handlerBuilder);
    };
  };
}
