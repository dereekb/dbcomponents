import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, ViewChild, Input, Directive, ContentChild, AfterViewInit, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DbNgxActionModule } from './action.module';
import { DbNgxActionComponent } from './action.component';
import { ActionContextStore } from './action.store';
import { HandleActionFunction } from './action.handler';
import { ActionContextStoreSourceInstance } from './action';
import { DbNgxActionHandlerDirective } from './handler.directive';

describe('DbNgxActionContextComponent', () => {

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [
        DbNgxActionModule,
        NoopAnimationsModule
      ],
      declarations: [
        TestActionComponentComponent
      ]
    }).compileComponents();
  });

  let testComponent: TestActionComponentComponent;

  let component: DbNgxActionComponent<number, number>;
  let handlerDirective: DbNgxActionHandlerDirective<number, number>;

  let fixture: ComponentFixture<TestActionComponentComponent>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestActionComponentComponent);
    testComponent = fixture.componentInstance;

    component = testComponent.component!;
    handlerDirective = testComponent.handlerDirective!;
    handlerDirective.handlerFunction = (() => of(0));

    fixture.detectChanges();
  });

  // NOTE: Also tested in action.directive.spec.ts
  describe('DbNgxActionContextComponent', () => {

    it('should be created', () => {
      expect(component).toBeDefined();
    });

    describe('ActionContextStoreSourceInstance', () => {

      let instance: ActionContextStoreSourceInstance<number, number>;

      beforeEach(() => {
        instance = component.sourceInstance;
      });

      it('should set state to triggered on trigger()', (done) => {
        instance.trigger();

        instance.triggered$.subscribe((x) => {
          expect(x).toBe(true);
          done();
        });

      });

      it('should set value ready on valueReady()', (done) => {
        const READY_VALUE = 1;

        // Clear to prevent issues.
        handlerDirective.handlerFunction = undefined;

        instance.readyValue(READY_VALUE);

        instance.valueReady$.subscribe((x) => {
          expect(x).toBe(READY_VALUE);
          done();
        });

      });


    });

    describe('ActionContextStore', () => {

      let contextStore: ActionContextStore<number, number>;

      beforeEach(async () => {
        contextStore = await component.store$.toPromise();
      });

      it('should set state to triggered on trigger()', (done) => {
        contextStore.trigger();

        contextStore.triggered$.subscribe((x) => {
          expect(x).toBe(true);
          done();
        });

      });

      it('should set value ready on valueReady()', (done) => {
        const READY_VALUE = 1;

        // Clear to prevent issues.
        handlerDirective.handlerFunction = undefined;

        contextStore.readyValue(READY_VALUE);

        contextStore.valueReady$.subscribe((x) => {
          expect(x).toBe(READY_VALUE);
          done();
        });

      });

    });

  });

});

@Component({
  template: `
    <dbx-action [dbxActionHandler]="handlerFunction">
      <p>Content</p>
    </dbx-action>
  `
})
class TestActionComponentComponent {

  @ViewChild(DbNgxActionComponent, { static: true })
  component?: DbNgxActionComponent<number, number>;

  @ViewChild(DbNgxActionHandlerDirective, { static: true })
  handlerDirective?: DbNgxActionHandlerDirective<number, number>;

  @Input()
  handlerFunction?: HandleActionFunction<number, number>;

}
