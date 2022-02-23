import { Directive, EventEmitter, Output, OnInit } from '@angular/core';
import { AbstractSubscriptionDirective } from '@dereekb/dbx-core';
import { TwoColumnsContextStore } from './two.column.store';

/**
 * Used with an DbxTwoColumnsComponent to help respond to a "back" function.
 */
@Directive({
  selector: '[dbxTwoColumnsBack]'
})
export class DbxTwoColumnsBackDirective extends AbstractSubscriptionDirective implements OnInit {

  @Output('dbxTwoColumnsBack')
  public back = new EventEmitter();

  constructor(public readonly twoColumnsContextStore: TwoColumnsContextStore) {
    super();
  }

  ngOnInit(): void {
    this.sub = this.twoColumnsContextStore.back$.subscribe(() => this.back.emit());
  }

  public backClicked(): void {
    this.twoColumnsContextStore.back();
  }

}
