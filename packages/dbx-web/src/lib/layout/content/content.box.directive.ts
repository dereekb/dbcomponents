import { Directive, Input } from '@angular/core';

/**
 * Component used to wrap content in a box with optionally elevation.
 */
@Directive({
  selector: 'dbx-content-box, [dbxContentBox]',
  host: {
    class: 'd-block dbx-content-box',
    '[class.dbx-content-elevate]': 'elevate && elevated',
    '[class.dbx-content-box-wide]': 'wide'
  }
})
export class DbxContentBoxDirective {
  @Input()
  elevate = true;

  @Input()
  wide = true;

  // MARK: Compat
  /**
   * @Deprecated use elevate instead
   */
  @Input()
  elevated = true;
}
