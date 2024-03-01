import { Directive, Input, Type, InjectionToken, Component, ChangeDetectionStrategy, Inject } from '@angular/core';
import { DbxValueListItem, DbxValueListItemConfig } from './list.view.value';
import { DbxValueListItemGroup, DbxValueListViewGroupDelegate, DbxValueListViewGroupValuesFunction, provideDbxValueListViewGroupDelegate } from './list.view.value.group';
import { BehaviorSubject, map } from 'rxjs';
import { Building, Maybe, PrimativeKey, SortCompareFunction, compareWithMappedValuesFunction, makeValuesGroupMap } from '@dereekb/util';
import { DbxListTitleGroupData, DbxListTitleGroupTitleDelegate } from './list.view.value.group.title';

export const DBX_LIST_TITLE_GROUP_DATA = new InjectionToken<unknown>('DbxListTitleGroupData');

/**
 * Delegate used to for grouping DbxValueListItemConfig<T, I> values.
 */
@Directive({
  selector: '[dbxListTitleGroup]',
  providers: [provideDbxValueListViewGroupDelegate(DbxListTitleGroupDirective)]
})
export class DbxListTitleGroupDirective<T, O extends PrimativeKey = PrimativeKey, D extends DbxListTitleGroupData<O> = DbxListTitleGroupData<O>, I extends DbxValueListItem<T> = DbxValueListItem<T>> implements DbxValueListViewGroupDelegate<D, T, I> {
  private _delegate = new BehaviorSubject<Maybe<DbxListTitleGroupTitleDelegate<T, O, D, I>>>(undefined);

  readonly groupValues: DbxValueListViewGroupValuesFunction<D, T, I, unknown, unknown> = (items: DbxValueListItemConfig<T, I>[]) => {
    return this._delegate.pipe(
      map((delegate) => {
        let groups: DbxValueListItemGroup<D, T, I>[];

        if (delegate != null) {
          const groupsValuesMap = makeValuesGroupMap(items, delegate.groupValueForItem);
          const { sortGroupsByData, cssClasses: inputCssClasses } = delegate;
          const cssClassesForAllGroups = inputCssClasses ?? [];

          const componentClass = delegate.headerComponentClass ?? DbxListTitleGroupHeaderComponent;
          groups = Array.from(groupsValuesMap.entries()).map(([value, items]) => {
            const data = delegate.dataForGroupValue(value as O, items);
            (data as Building<D>).value = value as O;
            const cssClasses = data.cssClasses ? [...cssClassesForAllGroups, ...data.cssClasses] : cssClassesForAllGroups;

            const group: DbxValueListItemGroup<D, T, I> = {
              id: String(value),
              data,
              items,
              headerConfig: {
                componentClass,
                providers: [
                  {
                    provide: DBX_LIST_TITLE_GROUP_DATA,
                    useValue: data
                  }
                ]
              },
              cssClasses
            };

            return group;
          });

          if (sortGroupsByData) {
            groups.sort(compareWithMappedValuesFunction((x) => x.data, sortGroupsByData));
          }
        } else {
          groups = [
            {
              id: '_',
              data: { value: null as any, title: '' } as D,
              items
            }
          ];
        }

        return groups;
      })
    );
  };

  ngOnDestroy(): void {
    this._delegate.complete();
  }

  @Input('dbxListTitleGroup')
  get delegate() {
    return this._delegate.value;
  }

  set delegate(delegate: Maybe<DbxListTitleGroupTitleDelegate<T, O, D, I>>) {
    this._delegate.next(delegate);
  }
}

/**
 *
 */
@Component({
  selector: 'dbx-list-title-group-header',
  template: `
    <div class="dbx-list-item-padded dbx-list-two-line-item">
      <mat-icon class="item-icon" *ngIf="icon">{{ icon }}</mat-icon>
      <div class="item-left">
        <div class="mat-subtitle-2">{{ title }}</div>
        <div *ngIf="hint" class="item-details">{{ hint }}</div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dbx-list-title-group-header'
  }
})
export class DbxListTitleGroupHeaderComponent<O extends PrimativeKey, D extends DbxListTitleGroupData<O>> {
  get icon() {
    return this.data.icon;
  }

  get title() {
    return this.data.title;
  }

  get hint() {
    return this.data.hint;
  }

  constructor(@Inject(DBX_LIST_TITLE_GROUP_DATA) readonly data: D) {}
}
