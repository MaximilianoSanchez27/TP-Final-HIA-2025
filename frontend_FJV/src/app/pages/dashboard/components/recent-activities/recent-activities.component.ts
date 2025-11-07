import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface RecentActivity {
  action: string;
  club: string;
  amount: number | null;
  date: string;
}

@Component({
  selector: 'app-recent-activities',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-activities.component.html',
  styleUrls: ['./recent-activities.component.css']
})
export class RecentActivitiesComponent {
  @Input() activities: RecentActivity[] = [];
}
