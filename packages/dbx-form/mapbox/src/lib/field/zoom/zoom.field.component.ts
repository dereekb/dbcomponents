import { AbstractControl, FormGroup } from '@angular/forms';
import { CompactContextStore, mapCompactModeObs } from '@dereekb/dbx-web';
import { Component, NgZone, OnDestroy, OnInit, Optional } from '@angular/core';
import { FieldTypeConfig, FormlyFieldProps } from '@ngx-formly/core';
import { FieldType } from '@ngx-formly/material';
import { first, BehaviorSubject, filter, shareReplay, startWith, switchMap, map, Observable } from 'rxjs';
import { filterMaybe, SubscriptionObject } from '@dereekb/rxjs';
import { ZoomLevel, Maybe, LatLngPoint, LatLngPointFunctionConfig, latLngPoint, LatLngStringFunction, latLngStringFunction } from '@dereekb/util';
import { GeolocationService } from '@ng-web-apis/geolocation';
import { Marker } from 'mapbox-gl';
import { DbxMapboxService, DbxMapboxMapStore, MapboxZoomLevel, provideMapboxStoreIfParentIsUnavailable, mapboxZoomLevel, MAPBOX_MAX_ZOOM_LEVEL, MAPBOX_MIN_ZOOM_LEVEL } from '@dereekb/dbx-web/mapbox';

export interface DbxFormMapboxZoomComponentFieldProps extends FormlyFieldProps {
  /**
   * (Optional) Whether or not the show the map. Cases where this would be set false is if another map is being used.
   *
   * Defaults to true.
   */
  showMap?: boolean;
  /**
   * Default center
   */
  center?: LatLngPoint;
  /**
   * Min zoom level allowed
   */
  minZoom?: MapboxZoomLevel;
  /**
   * Max zoom level allowed.
   */
  maxZoom?: MapboxZoomLevel;
  /**
   * Step size when using arrow keys.
   */
  zoomStep?: number;
}

@Component({
  template: `
    <div class="dbx-mapbox-input-field" [ngClass]="(compactClass$ | async) ?? ''" [formGroup]="formGroup">
      <div *ngIf="showMap" class="dbx-mapbox-input-field-map">
        <mgl-map dbxMapboxMap></mgl-map>
      </div>
      <div class="dbx-mapbox-input-field-input">
        <mat-form-field class="dbx-mapbox-input-field-input-field">
          <mat-label>Zoom Level</mat-label>
          <input type="number" matInput [min]="minZoom" [max]="maxZoom" [step]="zoomStep" [placeholder]="placeholder" [formControl]="formControl" />
        </mat-form-field>
      </div>
    </div>
  `,
  providers: [provideMapboxStoreIfParentIsUnavailable()],
  styleUrls: ['../mapbox.field.component.scss']
})
export class DbxFormMapboxZoomFieldComponent<T extends DbxFormMapboxZoomComponentFieldProps = DbxFormMapboxZoomComponentFieldProps> extends FieldType<FieldTypeConfig<T>> implements OnInit, OnDestroy {
  readonly compactClass$ = mapCompactModeObs(this.compact?.mode$, {
    compact: 'dbx-mapbox-input-field-compact'
  });

  private _sub = new SubscriptionObject();
  private _center = new BehaviorSubject<Maybe<LatLngPoint>>(undefined);

  private _formControlObs = new BehaviorSubject<Maybe<AbstractControl>>(undefined);
  readonly formControl$ = this._formControlObs.pipe(filterMaybe());

  readonly value$ = this.formControl$.pipe(
    switchMap((control) => control.valueChanges.pipe(startWith(control.value))),
    shareReplay(1)
  );

  readonly zoom$: Observable<MapboxZoomLevel> = this.value$.pipe(filterMaybe(), shareReplay(1));
  readonly center$ = this._center.pipe(filterMaybe());

  constructor(@Optional() readonly compact: CompactContextStore, readonly dbxMapboxService: DbxMapboxService, readonly dbxMapboxMapStore: DbxMapboxMapStore, readonly ngZone: NgZone) {
    super();
  }

  get center(): LatLngPoint {
    return this.field.props.center || latLngPoint(this.dbxMapboxService.defaultCenter);
  }

  get formGroupName(): string {
    return this.field.key as string;
  }

  get formGroup(): FormGroup {
    return this.form as FormGroup;
  }

  get label(): Maybe<string> {
    return this.field.props?.label;
  }

  get description(): Maybe<string> {
    return this.props.description;
  }

  get isReadonlyOrDisabled() {
    return this.props.readonly || this.disabled;
  }

  get showMap(): boolean {
    return this.field.props.showMap ?? true;
  }

  get minZoom(): MapboxZoomLevel {
    return mapboxZoomLevel(this.field.props.minZoom || MAPBOX_MIN_ZOOM_LEVEL);
  }

  get maxZoom(): MapboxZoomLevel {
    return mapboxZoomLevel(this.field.props.maxZoom || MAPBOX_MAX_ZOOM_LEVEL);
  }

  get zoomStep(): number {
    return mapboxZoomLevel(this.field.props.zoomStep || 1);
  }

  ngOnInit(): void {
    this._formControlObs.next(this.formControl);
    this._center.next(this.center);

    this.dbxMapboxMapStore.setZoom(this.zoom$);

    // Set center only if showMap is false.
    if (this.showMap) {
      this.dbxMapboxMapStore.setCenter(this.center$);
    }

    if (this.props.readonly) {
      this.formControl.disable();

      if (this.showMap) {
        this.dbxMapboxMapStore.setZoomDisabled();
      }
    }

    this._sub.subscription = this.dbxMapboxMapStore.zoom$.subscribe((zoom) => {
      if (!this.isReadonlyOrDisabled) {
        this.ngZone.run(() => this.setValue(zoom));
      }
    });
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this._formControlObs.complete();
    this._center.complete();
    this._sub.destroy();
  }

  setValue(zoom?: Maybe<ZoomLevel>) {
    this.formControl.setValue(zoom);
  }
}