import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ element, allowedRoles }) => {
    const token = localStorage.getItem('sessionToken');
    const role = localStorage.getItem('role');

    // Verifica se o usuário está autenticado e se tem o papel necessário
    if (!token) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/" replace />;
    }

    return element;
};

export default PrivateRoute;
