import { Directive, ChangeDetectorRef, Input } from '@angular/core';
import { DbxStyleService } from './style.service';
import { AbstractSubscriptionDirective, safeDetectChanges } from '@dereekb/dbx-core';
import { delay } from 'rxjs';
import { DbxThemeColor, dbxColorBackground } from './style';
import { Maybe } from '@dereekb/util';

/**
 * Used to apply a background style using a color.
 */
@Directive({
  selector: '[dbxColor]',
  host: {
    '[class]': 'style'
  }
})
export class DbxColorDirective {
  style = '';

  @Input()
  set dbxColor(dbxColor: Maybe<DbxThemeColor | ''>) {
    this.style = dbxColorBackground(dbxColor);
  }
}