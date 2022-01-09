import { Directive, Host, OnInit, OnDestroy, Input, NgZone } from '@angular/core';
import { LoadingContext } from '../loading/loading';
import { AbstractSubscriptionDirective } from '../utility';
import { AppErrorComponent } from './error.component';

/**
 * Context used for linking an AppErrorComponent to a LoadingContext.
 *
 * The error from the context is given to the app error when available.
 */
@Directive({
  selector: '[appLoadingError]'
})
export class AppLoadingErrorDirective extends AbstractSubscriptionDirective {

  constructor(@Host() public readonly error: AppErrorComponent) {
    super();
  }

  /**
   * Sets a LoadingContext that is watched for the loading state.
   */
  @Input('appLoadingError')
  set context(context: LoadingContext) {
    let subscription;

    if (context) {
      subscription = context.stream$.subscribe((x) => {
        this.error.error = x.error;
      });
    }

    this.sub = subscription;
  }

}
