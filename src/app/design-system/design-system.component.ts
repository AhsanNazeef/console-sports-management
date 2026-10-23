import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../common/components/button/button.component';
import { DialogComponent } from '../common/components/dialog/dialog.component';
import { SegmentedButtonComponent } from '../common/components/segmented-button/segmented-button.component';
import { TabsComponent } from '../common/components/tabs/tabs.component';
import { TagComponent } from '../common/components/tag/tag.component';
import { TextInputComponent } from '../common/components/text-input/text-input.component';

@Component({
  selector: 'app-design-system-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    DialogComponent,
    SegmentedButtonComponent,
    TabsComponent,
    TagComponent,
    TextInputComponent,
  ],
  templateUrl: './design-system.component.html',
  styleUrl: './design-system.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemPage {
  email = '';

  readonly tagSelected = signal(true);
  readonly activeTab = signal('text');
  readonly segment = signal('left');
  readonly dialogOpen = signal(false);

  readonly tabs = [
    { id: 'text', label: 'Text' },
    { id: 'other', label: 'Text' },
  ] as const;

  readonly segments = [
    { value: 'left', label: 'Value' },
    { value: 'right', label: 'Value' },
  ] as const;
}
