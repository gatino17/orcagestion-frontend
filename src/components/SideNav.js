import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "./Layout.css";

const navItems = [
  {
    section: "GENERAL",
    label: "Inicio",
    to: "/",
    icon: "fas fa-home",
    roles: ["admin", "tecnico", "operaciones", "soporte", "finanzas"],
  },
  {
    section: "GENERAL",
    label: "Consulta de centros",
    to: "/consulta-centro",
    icon: "fas fa-search",
    roles: ["admin", "tecnico", "operaciones", "soporte", "finanzas"],
  },
  {
    section: "OPERACIONES",
    label: "Soporte",
    to: "/soporte",
    icon: "fas fa-headset",
    roles: ["admin", "soporte", "operaciones"],
  },
  {
    section: "OPERACIONES",
    label: "Detalle de soporte",
    to: "/soporte/detalle",
    icon: "fas fa-clipboard-list",
    roles: ["admin", "soporte", "operaciones"],
  },
  {
    section: "PLANIFICACION",
    label: "Calendario",
    to: "/calendario",
    icon: "far fa-calendar-alt",
    roles: ["admin", "operaciones", "soporte"],
  },
  {
    section: "PLANIFICACION",
    label: "Historial de trabajos",
    to: "/historial-trabajos",
    icon: "fas fa-history",
    roles: ["admin", "operaciones", "soporte"],
  },
  {
    section: "ANALITICA",
    label: "Historial por centro",
    to: "/historial-centro",
    icon: "far fa-list-alt",
    roles: ["admin", "finanzas", "operaciones"],
  },
  {
    section: "REGISTROS",
    label: "Datos IP",
    to: "/datos-ip",
    icon: "fas fa-network-wired",
    roles: ["admin", "operaciones", "soporte"],
  },
  {
    section: "REGISTROS",
    label: "Clientes",
    to: "/clientes",
    icon: "fas fa-user-plus",
    roles: ["admin", "operaciones"],
  },
  {
    section: "REGISTROS",
    label: "Centros",
    to: "/centros",
    icon: "fas fa-folder-plus",
    roles: ["admin", "operaciones"],
  },
  {
    section: "REGISTROS",
    label: "Registro de actas",
    to: "/registrosdocumentos",
    icon: "fas fa-folder-open",
    roles: ["admin", "operaciones"],
  },
  {
    section: "EQUIPO",
    label: "Usuarios",
    to: "/usuarios",
    icon: "fas fa-users",
    roles: ["admin"],
  },
  {
    section: "EQUIPO",
    label: "Tecnicos",
    to: "/tecnicos",
    icon: "fas fa-address-book",
    roles: ["admin", "operaciones"],
  },
];

function SideNav() {
  const [usuario, setUsuario] = useState("Usuario");
  const [rol, setRol] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decodedToken = jwtDecode(token);
      setUsuario(decodedToken.name || "Usuario");
      setRol(decodedToken.rol || "");
    } catch (error) {
      console.error("Error al decodificar el token:", error);
    }
  }, []);

  useEffect(() => {
    const storedState = localStorage.getItem("orcagest:sidenav-collapsed");
    if (storedState) {
      setCollapsed(storedState === "true");
    } else if (window.innerWidth <= 992) {
      setCollapsed(true);
    }

    const handleToggle = () => {
      setCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem("orcagest:sidenav-collapsed", next);
        return next;
      });
    };

    window.addEventListener("orcagest-toggle-sidenav", handleToggle);
    return () => window.removeEventListener("orcagest-toggle-sidenav", handleToggle);
  }, []);

  useEffect(() => {
    const addClass = collapsed ? "sidenav-collapsed" : "sidenav-expanded";
    const removeClass = collapsed ? "sidenav-expanded" : "sidenav-collapsed";
    document.body.classList.add(addClass);
    document.body.classList.remove(removeClass);
    if (collapsed) {
      document.body.classList.add("sidenav-collapsed");
      document.body.classList.remove("sidenav-expanded");
    } else {
      document.body.classList.add("sidenav-expanded");
      document.body.classList.remove("sidenav-collapsed");
    }

    return () => {
      document.body.classList.remove("sidenav-collapsed", "sidenav-expanded");
    };
  }, [collapsed]);

  const itemsFiltrados = useMemo(() => {
    if (!rol) return [];
    return navItems.filter((item) => item.roles.includes(rol));
  }, [rol]);

  let ultimoTitulo = null;

  return (
    <aside className={`app-sidenav ${collapsed ? "collapsed" : ""}`}>
      <div className="sidenav-wrapper">
        <Link to="/" className="sidenav-logo" title="OrcaGest">
          <i className="fas fa-water" />
          <span>OrcaGest</span>
        </Link>

        <div className="sidenav-user">
          <small>Bienvenido</small>
          <h4>{usuario}</h4>
          <small>Rol: {rol || "N/A"}</small>
        </div>

        <div className="sidenav-menu">
          <ul className="list-unstyled mb-0">
            {itemsFiltrados.map((item) => {
              const mostrarTitulo = item.section !== ultimoTitulo;
              ultimoTitulo = item.section;
              return (
                <React.Fragment key={item.to}>
                  {item.section && mostrarTitulo && (
                    <li className="sidenav-section-title">{item.section}</li>
                  )}
                  <li>
                    <Link
                      to={item.to}
                      className={`sidenav-link ${
                        location.pathname === item.to ? "active" : ""
                      }`}
                      title={item.label}
                    >
                      <i className={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        </div>

        <div className="sidenav-bottom">
          <small>Version 1.0 - Operaciones OrcaGest</small>
        </div>
      </div>
    </aside>
  );
}

export default SideNav;
