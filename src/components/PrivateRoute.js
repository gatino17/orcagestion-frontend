import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const PrivateRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" />;
    }

    try {
        const decodedToken = jwtDecode(token);
        const userRole = decodedToken.rol;

        // Si no hay roles permitidos, se permite el acceso solo si el usuario está autenticado
        if (!allowedRoles || allowedRoles.includes(userRole)) {
            return children;
        }

        // Redirigir si el usuario no tiene permiso
        console.warn(`Acceso denegado para el rol: ${userRole}`);
        return <Navigate to="/login" />;
    } catch (error) {
        console.error('Error al decodificar el token:', error);
        return <Navigate to="/login" />;
    }
};

export default PrivateRoute;
