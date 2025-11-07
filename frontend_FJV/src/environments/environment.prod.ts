export const environment = {
  production: true,
  
  // La URL de la API debe ser la ruta relativa /api
  // para que Nginx la intercepte
  apiUrl: '/api', 
  
  // La URL del frontend en este proyecto Docker es la raíz
  frontendUrl: 'http://localhost' 
};