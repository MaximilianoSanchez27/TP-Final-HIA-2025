import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'noticias',
    loadComponent: () => import('../../components/noticias/admin/lista-noticias-admin/lista-noticias-admin.component')
      .then(m => m.ListaNoticiasAdminComponent)
  },
];
