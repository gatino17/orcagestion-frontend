import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const PrivateRoute = ({ children, allowedRoles, requiredPage }) => {
    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/login" />;

    try {
        const decodedToken = jwtDecode(token);
        const userRole = decodedToken.rol;
        const paginas = Array.isArray(decodedToken.paginas) ? decodedToken.paginas : [];

        if (requiredPage && paginas.length) {
            if (paginas.includes(requiredPage)) return children;
            return <Navigate to="/login" />;
        }

        if (!allowedRoles || allowedRoles.includes(userRole)) {
            return children;
        }
        return <Navigate to="/login" />;
    } catch (error) {
        console.error('Error al decodificar el token:', error);
        return <Navigate to="/login" />;
    }
};

export default PrivateRoute;
