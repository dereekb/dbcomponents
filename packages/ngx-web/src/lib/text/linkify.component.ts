import { Component, Input, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import linkifyStr from 'linkifyjs/string';
import { DomSanitizer } from '@angular/platform-browser';

// TODO: Replace linkifyjs/string with linkify-string.

/**
 * Used to "linkify" the input text.
 */
@Component({
  selector: 'dbx-linkify',
  template: `<span class="dbx-linkify" [innerHTML]="linkifiedBody$ | async"></span>`,
  styleUrls: ['./text.scss']
})
export class DbNgxLinkifyComponent implements OnDestroy {

  private _text = new BehaviorSubject<string>(undefined);

  readonly linkifiedText$ = this._text.pipe(
    distinctUntilChanged(),
    map(x => linkifyStr(x, {
      defaultProtocol: 'https',
      target: {
        url: '_blank'
      }
    })),
    shareReplay(1)
  );

  readonly linkifiedBody$ = this.linkifiedText$.pipe(
    map(x => {
      return this.sanitizer.bypassSecurityTrustHtml(x);
    }),
    shareReplay(1)
  );

  constructor(private readonly sanitizer: DomSanitizer) { }

  ngOnDestroy(): void {
    this._text.complete();
  }

  @Input()
  get text(): string {
    return this._text.value;
  }

  set text(text: string) {
    this._text.next(text);
  }

}
