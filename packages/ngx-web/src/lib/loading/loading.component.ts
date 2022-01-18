import { Component, Input, NgZone } from '@angular/core';
import { ThemePalette } from '@angular/material/core';
import { ProgressBarMode } from '@angular/material/progress-bar';
import { AbstractSubscriptionDirective } from '@dereekb/ngx-core';
import { LoadingContext } from '@dereekb/util-rxjs';

/**
 * Loading View component that provides content sections for loading, error, and an error action.
 */
@Component({
  selector: 'dbx-loading',
  template: `
  <dbx-basic-loading [show]="show" [color]="color" [text]="text" [mode]="mode" [linear]="linear" [diameter]="diameter" [error]="error" [waitFor]="loading">
    <ng-content loading select="[loading]"></ng-content>
    <ng-content></ng-content>
    <ng-content error select="[error]"></ng-content>
    <ng-content errorAction select="[errorAction]"></ng-content>
  </dbx-basic-loading>
  `
})
export class AppLoadingComponent extends AbstractSubscriptionDirective {

  @Input()
  show?: boolean;

  @Input()
  text?: string;

  @Input()
  mode: ProgressBarMode = 'indeterminate';

  @Input()
  color: ThemePalette = 'primary';

  @Input()
  diameter?: number;

  @Input()
  linear?: boolean;

  private _loading: boolean = false;
  private _error: any;

  constructor(private ngZone: NgZone) {
    super();
  }

  @Input()
  get loading(): boolean {
    return this._loading;
  }

  set loading(loading: boolean) {
    this._loading = loading;
  }

  @Input()
  get error(): any {
    return this._error;
  }

  set error(error: any) {
    this._error = error;
  }

  /**
   * Sets a LoadingContext that is watched for the loading state.
   */
  @Input()
  set context(context: LoadingContext) {
    let subscription;

    if (context) {
      subscription = context.stream$.subscribe((x) => {
        this.ngZone.run(() => {
          this._loading = x.loading;
          this._error = x.error;
        });
      });
    }

    this.sub = subscription;
  }

}
