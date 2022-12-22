import { Injector } from '@angular/core';
import { SegueRef } from '@dereekb/dbx-core';
import { ModelKey, ModelTypeString } from '@dereekb/util';
import { ModelViewContext } from './model.tracker';

/**
 * Generates a SegueRef based on the input model's key and optional view context.
 */
export type DbxModelTypeConfigurationSrefFactory = (key: ModelKey, context?: ModelViewContext) => SegueRef;

/**
 * Generates a DbxModelTypeConfigurationSrefFactory.
 */
export type DbxModelTypeConfigurationSrefFactoryBuilder = (injector: Injector) => DbxModelTypeConfigurationSrefFactory;

export interface DbxModelTypeConfiguration {
  /**
   * Popup label that can be used for these types.
   */
  label?: string;
  /**
   * Name used in analytics events. If not provided, label is used by default.
   */
  analyticsName?: string;
  /**
   * Model type this configuration is for.
   */
  modelType: ModelTypeString;
  /**
   * Sref factory for viewing objects of this type.
   */
  sref?: DbxModelTypeConfigurationSrefFactory;
  /**
   * DbxModelTypeConfigurationSrefFactoryBuilder
   */
  srefBuilder?: DbxModelTypeConfigurationSrefFactoryBuilder;
  /**
   * Icon used to represent this model.
   */
  icon?: string;
}

export interface DbxModelTypeConfigurationMap {
  [key: string]: DbxModelTypeConfiguration;
}