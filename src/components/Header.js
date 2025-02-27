import React, { useEffect, useState } from "react";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Header({ onLogout }) {
  const [estadoConexion, setEstadoConexion] = useState('checking');
  const navigate = useNavigate();
  
  useEffect(() => {
    // Verificar el estado de la conexión al montar el componente
    axios.get('http://localhost:5000/api/status')
      .then(response => {
        if (response.data.status === 'ok') {
          setEstadoConexion('connected');
        } else {
          setEstadoConexion('disconnected');
        }
      })
      .catch(() => {
        setEstadoConexion('disconnected');
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token"); // Eliminar el token
    onLogout(); // Actualiza el estado en App.js
    navigate("/login"); // Redirigir al login
  };

  const iconoEstado = estadoConexion === 'connected' ? 'fa-check-circle text-success' : 'fa-times-circle text-danger';

  return (
    <div>
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <button className="nav-link nav-link btn btn-link" data-widget="pushmenu">
              <i className="fas fa-bars" />
            </button>
          </li>   
        </ul>
        <ul className="navbar-nav ml-auto">
          <li className="nav-item">
            <button className="nav-link btn btn-link"  >
              Estado: {estadoConexion === 'connected' ? 'Conectado' : 'Desconectado'} <i className={`fas ${iconoEstado}`} />
            </button>
          </li>
          <li className="nav-item">
              <button
                  className="nav-link btn btn-link"
                  data-widget="fullscreen"
                >
                  <i className="fas fa-expand-arrows-alt" />
              </button>
          </li>
          <li className="nav-item">
          <button
              className="nav-link btn btn-link"
             
              onClick={handleLogout}
              
            >
              Salir <i className="fas fa-sign-out-alt" />
              </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default Header;
