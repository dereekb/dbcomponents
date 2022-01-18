import { FormlyFieldConfig } from '@ngx-formly/core';
import { formlyField } from '../field';

export function textEditorField({ key, label = '', placeholder = '', maxLength = undefined as number, required = false }): FormlyFieldConfig {
  const fieldConfig: FormlyFieldConfig = formlyField({
    key,
    type: 'texteditor',
    defaultValue: '',   // Set to always get a string as a result.
    modelOptions: {
      // https://formly.dev/examples/validation/async-validation-update-on
      // Set to trigger value update on blurs with the form. However, the value is set internally too.
      updateOn: 'blur'
    },
    templateOptions: {
      label,
      placeholder,
      maxLength,
      required
    },
  });
  return fieldConfig;
}
