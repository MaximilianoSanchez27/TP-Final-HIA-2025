import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Team {
  name: string;
  logo: string;
  score: number;
  winner: boolean;
}

interface Match {
  id: number;
  date: string;
  tournament: string;
  teamA: Team;
  teamB: Team;
  category: string;
  location: string;
}

@Component({
  selector: 'app-recent-results',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recent-results.component.html',
  styleUrls: ['./recent-results.component.css']
})
export class RecentResultsComponent implements OnInit {
  recentMatches: Match[] = [];

  ngOnInit(): void {
    this.loadRecentMatches();
  }

  private loadRecentMatches(): void {
    this.recentMatches = [
      {
        id: 1,
        date: '15 Jun 2025',
        tournament: 'Torneo Provincial',
        teamA: {
          name: 'Club Atlético',
          logo: 'images/equipo1.webp',
          score: 3,
          winner: true
        },
        teamB: {
          name: 'Villa San Martín',
          logo: 'images/equipo2.webp',
          score: 1,
          winner: false
        },
        category: 'Primera División',
        location: 'Estadio Municipal'
      },
      {
        id: 2,
        date: '12 Jun 2025',
        tournament: 'Liga Regional',
        teamA: {
          name: 'Deportivo Jujuy',
          logo: 'images/equipo2.webp',
          score: 2,
          winner: false
        },
        teamB: {
          name: 'Juventud Unida',
          logo: 'images/equipo1.webp',
          score: 3,
          winner: true
        },
        category: 'Sub-18',
        location: 'Polideportivo San Pedro'
      },
      {
        id: 3,
        date: '10 Jun 2025',
        tournament: 'Copa Jujuy',
        teamA: {
          name: 'Universitario',
          logo: 'images/equipo1.webp',
          score: 3,
          winner: true
        },
        teamB: {
          name: 'Club Central',
          logo: 'images/equipo2.webp',
          score: 0,
          winner: false
        },
        category: 'Femenino',
        location: 'Centro Deportivo UNJU'
      },
      {
        id: 4,
        date: '08 Jun 2025',
        tournament: 'Torneo Provincial',
        teamA: {
          name: 'Palermo',
          logo: 'images/equipo2.webp',
          score: 3,
          winner: true
        },
        teamB: {
          name: 'Club Ledesma',
          logo: 'images/equipo1.webp',
          score: 2,
          winner: false
        },
        category: 'Primera División',
        location: 'Estadio Libertador'
      }
    ];
  }
}
