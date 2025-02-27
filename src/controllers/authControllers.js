import { loginUsuario } from '../api';

export const iniciarSesion = async (credenciales, onSuccess, onError) => {
    try {
        const data = await loginUsuario(credenciales);
        localStorage.setItem('token', data.token); // Almacena el token en el navegador
        alert('Inicio de sesión exitoso');
        onSuccess(); // Redirige o actualiza el estado de la aplicación
    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        onError('Credenciales incorrectas. Inténtalo nuevamente.');
    }
};

export const cerrarSesion = () => {
    localStorage.removeItem('token'); // Elimina el token
    alert('Has cerrado sesión');
};
