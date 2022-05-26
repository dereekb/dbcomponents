import { DOC_AUTH_ROUTES } from '../doc.auth';
import { DocFeatureCard } from './../../shared/component/feature.card.list.component';
import { Component } from '@angular/core';

@Component({
  templateUrl: './home.component.html'
})
export class DocAuthHomeComponent {
  cards: DocFeatureCard[] = DOC_AUTH_ROUTES.map((anchor) => ({
    title: anchor.title,
    detail: anchor.detail,
    anchor
  }));
}
