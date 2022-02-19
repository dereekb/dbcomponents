import { LabeledFieldConfig, formlyField, templateOptionsForFieldConfig } from '../field';
import { DbxChecklistItemFieldConfig, ChecklistItemFormlyFieldConfig } from './checklist.item.field.component';

export interface ChecklistItemFieldConfig<T = any> extends LabeledFieldConfig, DbxChecklistItemFieldConfig<T> { }
export type ChecklistItemFieldBuilderInput<T = any> = Partial<ChecklistItemFieldConfig<T>> & Pick<ChecklistItemFieldConfig<T>, 'key' | 'displayContentObs'>;

export function checklistItemField<T = any>(config: ChecklistItemFieldBuilderInput<T>): ChecklistItemFormlyFieldConfig<T> {
  const {
    key,
    displayContentObs,
    componentClass
  } = config;

  const fieldConfig: ChecklistItemFormlyFieldConfig = formlyField({
    key,
    type: 'checklistitem',
    checklistField: {
      displayContentObs,
      componentClass
    },
    ...templateOptionsForFieldConfig(config)
  });

  return fieldConfig;
}
