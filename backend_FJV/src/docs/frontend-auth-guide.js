/**
 * GUÍA PARA CONSUMIR LA API DE AUTENTICACIÓN DESDE EL FRONTEND
 * 
 * === ENDPOINTS DE AUTENTICACIÓN ===
 * 
 * 1. LOGIN
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Response: { success: boolean, message: string, usuario: Object, token: string }
 * 
 * 2. VERIFICAR TOKEN
 * GET /api/auth/check-token
 * Headers: Authorization: Bearer [token]
 * Response: { valid: boolean, message: string }
 * 
 * 3. VALIDAR TOKEN (con info de usuario)
 * GET /api/auth/validate-token
 * Headers: Authorization: Bearer [token]
 * Response: { success: boolean, message: string, user: Object }
 * 
 * === FLUJO TÍPICO ===
 * 
 * 1. Usuario ingresa credenciales en el formulario de login
 * 2. Frontend hace POST a /api/auth/login
 * 3. Si es exitoso, almacena el token en localStorage y redirige al dashboard
 * 4. Cada solicitud posterior incluye el token en el header Authorization
 * 5. Para verificar si el token sigue siendo válido (ej. al cargar la app), 
 *    usar GET /api/auth/check-token
 * 
 * === MANEJO DE ERRORES ===
 * 
 * - 401 Unauthorized: Token inválido o expirado, redirigir a login
 * - 403 Forbidden: Token válido pero sin permisos suficientes
 * 
 * === EJEMPLO DE USO ===
 * 
 * // Login
 * fetch('http://localhost:3000/api/auth/login', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ email: 'usuario@sistema.com', password: 'Usuario123!' })
 * })
 * .then(res => res.json())
 * .then(data => {
 *   if (data.success) {
 *     localStorage.setItem('token', data.token);
 *     console.log('Login exitoso:', data.usuario);
 *   }
 * });
 * 
 * // Haciendo una solicitud autenticada
 * fetch('http://localhost:3000/api/personas', {
 *   headers: {
 *     'Authorization': `Bearer ${localStorage.getItem('token')}`
 *   }
 * })
 * .then(res => {
 *   if (res.status === 401) {
 *     // Token expirado o inválido
 *     localStorage.removeItem('token');
 *     window.location.href = '/login';
 *     throw new Error('Sesión expirada');
 *   }
 *   return res.json();
 * })
 * .then(data => console.log('Datos:', data));
 */
