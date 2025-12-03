import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Layout.css";

function Header({ onLogout }) {
  const [estadoConexion, setEstadoConexion] = useState("checking");
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/status")
      .then((response) => {
        if (response.data.status === "ok") {
          setEstadoConexion("connected");
        } else {
          setEstadoConexion("disconnected");
        }
      })
      .catch(() => setEstadoConexion("disconnected"));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    onLogout();
    navigate("/login");
  };

  const estadoTexto =
    estadoConexion === "connected"
      ? "Conectado"
      : estadoConexion === "checking"
      ? "Verificando"
      : "Desconectado";

  const handleToggleNav = () => {
    window.dispatchEvent(new Event("orcagest-toggle-sidenav"));
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="header-icon-button"
          data-widget="pushmenu"
          onClick={handleToggleNav}
          title="Mostrar/ocultar menu"
        >
          <i className="fas fa-bars" />
        </button>
        <div className="header-brand">
          <i className="fas fa-satellite-dish" />
          <div>
            <span>OrcaGest</span>
            <small>Panel Operativo</small>
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className={`status-pill ${estadoConexion}`}>{estadoTexto}</div>
        <button
          className="header-icon-button"
          data-widget="fullscreen"
          title="Pantalla completa"
        >
          <i className="fas fa-expand-arrows-alt" />
        </button>
        <button className="header-icon-button logout" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt mr-2" />
          Salir
        </button>
      </div>
    </header>
  );
}

export default Header;
