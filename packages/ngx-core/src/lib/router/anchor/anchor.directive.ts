import { map, shareReplay, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { Directive, Input } from '@angular/core';
import { Maybe } from '@dereekb/util';
import { AnchorType, ClickableAnchor, anchorTypeForAnchor, DbNgxAnchor } from './anchor';

/**
 * Abstract anchor directive.
 */
@Directive()
export class AbstractDbNgxAnchorDirective<T extends ClickableAnchor = ClickableAnchor> implements DbNgxAnchor {

  private _disabled = new BehaviorSubject<Maybe<boolean>>(false);
  private _anchor = new BehaviorSubject<Maybe<T>>(undefined);

  readonly disabled$ = this._disabled.asObservable();
  readonly anchor$ = this._anchor.asObservable();

  readonly type$: Observable<AnchorType> = combineLatest([this.disabled$, this.anchor$]).pipe(
    debounceTime(10),
    map(([disabled, anchor]) => anchorTypeForAnchor(anchor, disabled)),
    shareReplay(1)
  );

  @Input()
  public get anchor(): Maybe<T> {
    return this._anchor.value;
  }

  public set anchor(anchor: Maybe<T>) {
    this._anchor.next(anchor);
  }

  @Input()
  public get disabled(): Maybe<boolean> {
    return this._disabled.value;
  }

  public set disabled(disabled: Maybe<boolean>) {
    this._disabled.next(disabled);
  }

}
