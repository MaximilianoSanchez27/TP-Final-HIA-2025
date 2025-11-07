export const environment = {
  production: false,
  // La URL de la API ahora apunta a una ruta relativa
  // Nginx la interceptará y la redirigirá al backend
  apiUrl: '/api',
  
  // La URL del frontend es la que sirve Nginx
  frontendUrl: 'http://localhost' 
};