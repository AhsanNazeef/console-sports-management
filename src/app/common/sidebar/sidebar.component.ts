import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavGroup } from '../models/navigation.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly groups = input.required<readonly NavGroup[]>();
  readonly collapsed = input(false);
  readonly userEmail = input<string | null>(null);

  readonly collapsedChange = output<boolean>();
  readonly itemSelected = output<void>();
  readonly signOut = output<void>();

  readonly closedGroupIds = signal<ReadonlySet<string>>(new Set());

  toggleCollapsed(): void {
    this.collapsedChange.emit(!this.collapsed());
  }

  isGroupOpen(groupId: string): boolean {
    return !this.closedGroupIds().has(groupId);
  }

  toggleGroup(groupId: string): void {
    const closed = new Set(this.closedGroupIds());
    if (closed.has(groupId)) {
      closed.delete(groupId);
    } else {
      closed.add(groupId);
    }
    this.closedGroupIds.set(closed);
  }
}
