import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

import './App.css';
import Header from "./components/Header";
import Footer from "./components/Footer";
import SideNav from "./components/SideNav";
import PrivateRoute from "./components/PrivateRoute";

// Vistas
import Login from "./vistas/Login";
import Home from "./vistas/Home";
import Soporte from "./vistas/Soporte";
import SoporteDetalle from "./vistas/SoporteDetalle";
import Clientes from "./vistas/Clientes";
import Calendario from "./vistas/Calendario";
import HistorialTrabajos from "./vistas/HistorialTrabajos";
import HistorialCentros from "./vistas/HistorialCentros";
import DatosIP from "./vistas/DatosIP";
import ConsultaCentro from "./vistas/ConsultaCentro";
import Usuarios from "./vistas/Usuarios";
import Centros from "./vistas/Centros";
import Tecnicos from "./vistas/Tecnicos";
import RegistrosDocumentos from './vistas/RegistrosDocumentos';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
    //const [userRole, setUserRole] = useState(null);

    useEffect(() => {
      const token = localStorage.getItem('token');
      if (token) {
          try {
              const decodedToken = jwtDecode(token);
              console.log("Token decodificado:", decodedToken);
               // Guarda el rol del usuario
          } catch (error) {
              console.error("Error al decodificar el token:", error);
          }
      }
    }, []);

    const handleLoginSuccess = () => {
      const token = localStorage.getItem('token');
      if (token) {
          jwtDecode(token);
          
      }
      setIsAuthenticated(true);
    };
  

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
    };

    return (
        <Router>
            <div className={`wrapper ${!isAuthenticated ? 'wrapper-login' : ''}`}>
                {isAuthenticated && <Header onLogout={handleLogout} />}
                {isAuthenticated && <SideNav />}

                <div className="content-wrapper">
                    <Routes>
                        <Route path="/login" element={!isAuthenticated ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} />

                        <Route
                            path="/"
                            element={
                              <PrivateRoute allowedRoles={['admin', 'tecnico', 'soporte', 'operaciones', 'finanzas']}>
                                    <Home />
                                </PrivateRoute>
                            }
                        />
                        {/* Rutas protegidas */}
                        <Route
                            path="/soporte"
                            element={
                              <PrivateRoute allowedRoles={['admin', 'soporte', 'operaciones']}>
                                    <Soporte />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/soporte/detalle"
                            element={
                              <PrivateRoute allowedRoles={['admin', 'soporte', 'operaciones']}>
                                    <SoporteDetalle />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/clientes"
                            element={
                              <PrivateRoute allowedRoles={['admin', 'operaciones']}>
                                    <Clientes />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/calendario"
                            element={
                              <PrivateRoute allowedRoles={['admin', 'operaciones', 'soporte']}>
                                    <Calendario />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/historial-trabajos"
                            element={
                              <PrivateRoute allowedRoles={['admin', 'operaciones', 'soporte']}>
                                    <HistorialTrabajos />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/historial-centro"
                            element={
                              <PrivateRoute allowedRoles={['admin','finanzas', 'operaciones']}>
                                    <HistorialCentros />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/datos-ip"
                            element={
                              <PrivateRoute allowedRoles={['admin', 'operaciones', 'soporte']}>
                                    <DatosIP />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/consulta-centro"
                            element={
                              <PrivateRoute allowedRoles={['admin', 'tecnico', 'soporte', 'operaciones', 'finanzas']}>
                                    <ConsultaCentro />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/usuarios"
                            element={
                              <PrivateRoute allowedRoles={['admin']}>
                                    <Usuarios />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/centros"
                            element={
                              <PrivateRoute allowedRoles={['admin', 'operaciones']}>
                                    <Centros />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/tecnicos"
                            element={
                              <PrivateRoute allowedRoles={['admin', 'operaciones']}>
                                    <Tecnicos />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/registrosdocumentos"
                            element={
                              <PrivateRoute allowedRoles={['admin', 'operaciones']}>
                                    <RegistrosDocumentos />
                                </PrivateRoute>
                            }
                        />

                        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
                    </Routes>
                </div>

                {isAuthenticated && <Footer />}
            </div>
        </Router>
    );
}

export default App;
