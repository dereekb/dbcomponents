import { ClickableAnchor } from "@/app/common/nav/anchor/anchor";
import { Observable } from "rxjs";

export interface ChecklistItemDisplayContent<T = any> {
  /**
   * Label to display.
   */
  label?: string;
  /**
   * Secondary label/value to display. May be used as the string value.
   */
  sublabel?: string;
  /**
  * Hint/description to display.
  */
  description?: string;
  /**
   * Whether or not to display the ripple. Is true by default if the anchor is present.
   */
  ripple?: boolean;
  /**
   * Optional anchor to apply on the visible content.
   */
  anchor?: ClickableAnchor;
  /**
   * Value metadata. How it is used depends on the display component used.
   */
  meta?: T;
}

/**
 * Component used for rendering checklist content.
 * 
 * Content is injected.
 */
export interface ChecklistItemFieldDisplayComponent<T = any> {
  displayContent: ChecklistItemDisplayContent<T>;
}

export type ChecklistItemFieldDisplayContentObs<T = any> = Observable<ChecklistItemDisplayContent<T>>;
