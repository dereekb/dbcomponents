import { filterMaybe } from '@dereekb/rxjs';
import { Directive, Input, OnDestroy } from '@angular/core';
import { Maybe } from '@dereekb/util';
import { BehaviorSubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ProvideSecondaryActionStoreSource, SecondaryActionContextStoreSource, ActionContextStoreSource, actionContextStoreSourcePipe } from '../../action.store.source';

/**
 * Directive that provides a DbxActionSourceDirective that is passed in.
 */
@Directive({
  selector: '[dbxActionSource]',
  providers: ProvideSecondaryActionStoreSource(DbxActionSourceDirective)
})
export class DbxActionSourceDirective implements SecondaryActionContextStoreSource, OnDestroy {

  private _source = new BehaviorSubject<Maybe<ActionContextStoreSource>>(undefined);
  readonly store$ = this._source.pipe(filterMaybe(), switchMap((x) => actionContextStoreSourcePipe(x.store$)));

  ngOnDestroy(): void {
    this._source.complete();
  }

  @Input('dbxActionSource')
  get source(): Maybe<ActionContextStoreSource> {
    return this._source.value;
  }

  set source(source: Maybe<ActionContextStoreSource>) {
    if (source && !source.store$) {
      throw new Error('Invalid source passed to dbxActionSource.');
    }

    this._source.next(source);
  }

}
