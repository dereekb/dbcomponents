import { formlyField, DescriptionFieldConfig, LabeledFieldConfig } from '../../field';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { EnumValueFieldOption } from './enum';

export interface StaticEnumFieldConfig<T> extends LabeledFieldConfig, DescriptionFieldConfig {
  /**
   * Whether or not multiple values can be selected.
   */
  multiple?: boolean;
  /**
   * Options
   */
  options: EnumValueFieldOption<T>[];
}

export function staticEnumField<T = unknown>({ key, label = '', placeholder = '', description, multiple = false, required = false, options }: StaticEnumFieldConfig<T>): FormlyFieldConfig {
  const fieldConfig: FormlyFieldConfig = formlyField({
    key,
    type: 'select',
    templateOptions: {
      label,
      description,
      placeholder,
      required,
      multiple,
      selectAllOption: 'Select All',
      options
    }
  });

  return fieldConfig;
}
