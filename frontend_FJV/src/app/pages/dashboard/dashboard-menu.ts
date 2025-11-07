export const dashboardMenu = [
  {
    title: 'Inicio',
    icon: 'home',
    link: '/dashboard',
    roles: ['admin']
  },
  {
    title: 'Usuarios',
    icon: 'users',
    link: '/dashboard/usuarios',
    roles: ['admin']
  },
  {
    title: 'Noticias',
    icon: 'newspaper',
    link: '/dashboard/noticias',
    roles: ['admin'],
    submenu: [
      {
        title: 'Dashboard',
        icon: 'chart-pie',
        link: '/dashboard/noticias',
      },
      {
        title: 'Listar Todas',
        icon: 'list',
        link: '/dashboard/noticias/listado',
      },
      {
        title: 'Nueva Noticia',
        icon: 'plus',
        link: '/dashboard/noticias/nueva',
      }
    ]
  },
  {
    title: 'Configuración',
    icon: 'cog',
    link: '/dashboard/configuracion',
    roles: ['admin']
  }
];
