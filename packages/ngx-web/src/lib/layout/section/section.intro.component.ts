import { OnDestroy } from '@angular/core';
import { Component, Input, EventEmitter, Output } from '@angular/core';
import { DbNgxSectionComponent } from './section.component';

/**
 * Component used to format content that displays an intro until a button is pressed.
 */
@Component({
  selector: 'dbx-intro-action-section',
  template: `
  <div class="dbx-intro-action-section" [ngSwitch]="showIntro">
    <div *ngSwitchCase="true" class="dbx-intro-action-section-intro">
      <p>{{ hint }}</p>
      <div>
        <ng-content select="[info]"></ng-content>
      </div>
      <div>
        <button mat-raised-button color="accent" (click)="actionClicked()">{{ action }}</button>
      </div>
    </div>
    <ng-container *ngSwitchCase="false">
      <ng-content></ng-content>
    </ng-container>
  </div>
  `,
  styleUrls: ['./container.scss']
})
export class DbNgxIntroActionSectionComponent extends DbNgxSectionComponent implements OnDestroy {

  @Output()
  showAction = new EventEmitter();

  @Input()
  showIntro: boolean;

  @Input()
  action: string;

  ngOnDestroy() {
    this.showAction.complete();
  }

  actionClicked() {
    this.showAction.next();
  }

}