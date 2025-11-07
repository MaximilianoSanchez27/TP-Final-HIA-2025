/**
 * GUÍA PARA INTEGRAR AUTENTICACIÓN SOCIAL (OAUTH) EN EL FRONTEND
 * 
 * Este documento explica cómo implementar los flujos de autenticación social
 * con Google y LinkedIn desde el frontend Angular.
 * 
 * === FLUJO DE AUTENTICACIÓN SOCIAL ===
 * 
 * 1. INICIAR FLUJO DE AUTENTICACIÓN
 *    - Abrir ventana emergente con la URL de autenticación del proveedor
 *    - El backend redirige al usuario para autenticarse con el proveedor
 * 
 * 2. PROCESAR CALLBACK
 *    - Después de autenticarse, el backend redirige a nuestra página de callback en el frontend
 *    - Frontend extrae token y datos de usuario de la URL
 *    - Se almacenan en localStorage y se actualiza el estado de la aplicación
 * 
 * === EJEMPLO DE IMPLEMENTACIÓN EN ANGULAR ===
 * 
 * // auth.service.ts - Método para iniciar autenticación social
 * loginWithGoogle(): void {
 *   const url = `${this.apiUrl}/auth/google`;
 *   const windowFeatures = 'width=500,height=600,resizable=yes,scrollbars=yes,status=yes';
 *   this.socialAuthWindow = window.open(url, 'SocialAuth', windowFeatures);
 *   
 *   // Monitorear cuando se cierra la ventana
 *   const checkClosed = setInterval(() => {
 *     if (this.socialAuthWindow?.closed) {
 *       clearInterval(checkClosed);
 *       // Verificar si el login fue exitoso comprobando el token
 *       if (localStorage.getItem('token')) {
 *         console.log('Autenticación social exitosa');
 *         this.authStatusChanged.next(true);
 *       }
 *     }
 *   }, 500);
 * }
 * 
 * // auth-callback.component.ts - Componente de callback
 * ngOnInit(): void {
 *   // Obtener parámetros de URL
 *   const urlParams = new URLSearchParams(window.location.search);
 *   const success = urlParams.get('success');
 *   
 *   if (success === 'true') {
 *     // Autenticación exitosa
 *     const token = urlParams.get('token');
 *     const userDataStr = urlParams.get('userData');
 *     
 *     if (token && userDataStr) {
 *       // Guardar en localStorage
 *       localStorage.setItem('token', token);
 *       localStorage.setItem('user', userDataStr);
 *       
 *       // Informar a la ventana principal y cerrar esta ventana
 *       if (window.opener) {
 *         window.opener.postMessage({ type: 'AUTH_SUCCESS' }, '*');
 *         window.close();
 *       } else {
 *         // Si no hay ventana opener, redirigir
 *         this.router.navigate(['/dashboard']);
 *       }
 *     }
 *   } else {
 *     // Autenticación fallida
 *     const error = urlParams.get('error') || 'Error desconocido';
 *     console.error('Error en autenticación social:', error);
 *     
 *     if (window.opener) {
 *       window.opener.postMessage({ type: 'AUTH_ERROR', error }, '*');
 *       window.close();
 *     } else {
 *       this.error = error;
 *       setTimeout(() => {
 *         this.router.navigate(['/login']);
 *       }, 3000);
 *     }
 *   }
 * }
 * 
 * === RUTAS DE AUTENTICACIÓN SOCIAL DISPONIBLES ===
 * 
 * 1. Google OAuth
 * GET /api/auth/google
 * 
 * 2. LinkedIn OAuth
 * GET /api/auth/linkedin
 * 
 * === NOTAS ADICIONALES ===
 * 
 * - La URL de callback debe coincidir exactamente con la configurada en el backend
 * - La autenticación social requiere HTTPS en producción
 * - Para pruebas en localhost, muchos proveedores permiten HTTP
 */
