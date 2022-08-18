import { FormlyFieldConfig } from '@ngx-formly/core';
import { Validators, AbstractControl } from '@angular/forms';
import { TextFieldConfig, textField } from './text.field';
import { LabeledFieldConfig, DescriptionFieldConfig, validatorsForFieldConfig } from '../../field';
import { LAT_LNG_PATTERN, LAT_LNG_PATTERN_MAX_PRECISION } from '@dereekb/util';

export const PHONE_LABEL_MAX_LENGTH = 100;

export const ADDRESS_COUNTRY_MAX_LENGTH = 80;
export const ADDRESS_CITY_MAX_LENGTH = 80;
export const ADDRESS_STATE_MAX_LENGTH = 80;
export const ADDRESS_ZIP_MAX_LENGTH = 20;

export const LABEL_STRING_MAX_LENGTH = 100;
export const SEARCH_STRING_MAX_LENGTH = 100;

export function nameField({ key = 'name', label = 'Name', placeholder = 'John Doe', required = false, minLength, maxLength, attributes }: Partial<TextFieldConfig> = {}): FormlyFieldConfig {
  return textField({
    key,
    label,
    placeholder,
    required,
    minLength,
    maxLength,
    attributes
  });
}

export interface EmailFieldConfig extends Partial<LabeledFieldConfig>, DescriptionFieldConfig {
  rows?: number;
}

export function emailField(config: EmailFieldConfig = {}): FormlyFieldConfig {
  const { key = 'email', label = 'Email Address', placeholder = 'you@example.com' } = config;
  const emailFieldConfig = textField({
    ...config,
    key,
    label,
    placeholder,
    inputType: 'email'
  });

  emailFieldConfig.validators = {
    email: {
      expression: (c: AbstractControl) => !Validators.email(c),
      message: () => `Not a valid email address.`
    }
  };

  return emailFieldConfig;
}

export function cityField({ key = 'city', required = false }: Partial<TextFieldConfig> = {}): FormlyFieldConfig {
  return textField({
    key,
    label: 'City',
    placeholder: '',
    required,
    autocomplete: 'city',
    maxLength: ADDRESS_CITY_MAX_LENGTH
  });
}

export function stateField({ key = 'state', required = false }: Partial<TextFieldConfig> = {}): FormlyFieldConfig {
  return textField({
    key,
    label: 'State',
    placeholder: '',
    required,
    autocomplete: 'state',
    maxLength: ADDRESS_STATE_MAX_LENGTH
  });
}

export function countryField({ key = 'country', required = false }: Partial<TextFieldConfig> = {}): FormlyFieldConfig {
  return textField({
    key,
    label: 'Country',
    placeholder: '',
    required,
    autocomplete: 'country',
    maxLength: ADDRESS_COUNTRY_MAX_LENGTH
  });
}

export function zipCodeField({ key = 'zip', required = false }: Partial<TextFieldConfig> = {}): FormlyFieldConfig {
  return textField({
    key,
    label: 'Zip Code',
    placeholder: '',
    required,
    autocomplete: 'postal-code',
    maxLength: ADDRESS_ZIP_MAX_LENGTH
  });
}

export const DEFAULT_LAT_LNG_TEXT_FIELD_PLACEHOLDER = '12.345,-67.8910';
export const DEFAULT_LAT_LNG_TEXT_FIELD_PATTERN_MESSAGE = `Invalid/unknown coordinates`;

export function latLngTextField({ key = 'latLng' }: Partial<TextFieldConfig> = {}): FormlyFieldConfig {
  const field = {
    ...textField({
      key,
      label: 'Coordinates',
      placeholder: DEFAULT_LAT_LNG_TEXT_FIELD_PLACEHOLDER,
      pattern: LAT_LNG_PATTERN,
      autocomplete: false
    }),
    ...validatorsForFieldConfig({
      messages: {
        pattern: DEFAULT_LAT_LNG_TEXT_FIELD_PATTERN_MESSAGE
      }
    })
  };

  return field;
}
