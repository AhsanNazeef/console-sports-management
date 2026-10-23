import { ChangeDetectionStrategy, Component } from '@angular/core';

// Stands in for sections that later tasks will build.
@Component({
  selector: 'app-coming-soon-page',
  standalone: true,
  templateUrl: './coming-soon.component.html',
  styleUrl: './coming-soon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoonPage {}
