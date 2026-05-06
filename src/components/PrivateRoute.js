import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const PrivateRoute = ({ children, allowedRoles, requiredPage, enforceAllowedRoles = false }) => {
    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/login" />;

    try {
        const decodedToken = jwtDecode(token);
        const userRole = String(decodedToken.rol || '').trim().toLowerCase();
        const paginas = Array.isArray(decodedToken.paginas) ? decodedToken.paginas : [];
        const allowedRolesNorm = Array.isArray(allowedRoles)
            ? allowedRoles.map((r) => String(r || '').trim().toLowerCase())
            : [];

        if (enforceAllowedRoles && allowedRolesNorm.length && !allowedRolesNorm.includes(userRole)) {
            return <Navigate to="/login" />;
        }

        if (requiredPage && paginas.length) {
            if (paginas.includes(requiredPage)) return children;
            if (allowedRolesNorm.length && allowedRolesNorm.includes(userRole)) return children;
            return <Navigate to="/login" />;
        }

        if (!allowedRolesNorm.length || allowedRolesNorm.includes(userRole)) {
            return children;
        }
        return <Navigate to="/login" />;
    } catch (error) {
        console.error('Error al decodificar el token:', error);
        return <Navigate to="/login" />;
    }
};

export default PrivateRoute;
