import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";



function SideNav() {

  const [usuario, setUsuario] = useState("");
  const [rol, setRol] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
        try {
            const decodedToken = jwtDecode(token);
            setUsuario(decodedToken.name || "Usuario"); // Asigna el nombre
            setRol(decodedToken.rol || ""); // Asigna el rol
        } catch (error) {
            console.error("Error al decodificar el token:", error);
        }
    }
  }, []);

  return (
    <div >
{/* Main Sidebar Container */}
<aside className="main-sidebar sidebar-dark-primary elevation-4">
  {/* Brand Logo */}
  <Link to="/" className="brand-link">
    <img src="dist/img/AdminLTELogo.png" alt="AdminLTE Logo" className="brand-image img-circle elevation-3" style={{opacity: '.8'}} />
    <span className="brand-text font-weight-light">OrcaGest</span>
    </Link>
  {/* Sidebar */}
  <div className="sidebar">
    {/* Sidebar user panel (optional) */}
    <div className="user-panel mt-3 pb-3 mb-3 d-flex">
      
      <div className="info">
        
      <h4 style={{ color: "white" }}>{usuario}</h4>
      <small style={{ color: "gray" }}>Rol: {rol}</small>

      </div>
    </div>   
    
    {/* Sidebar Menu */}
    <nav className="mt-2">
      <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
        {/* Add icons to the links using the .nav-icon class
         with font-awesome or any other icon font library */}
        {["admin", "tecnico", "operaciones","soporte","finanzas"].includes(rol) && (
          <li className="nav-item menu-open">
          <Link to="/" className="nav-link">
              <i className="nav-icon fas fa-home" />
              <p>
                Inicio
                <i className="right fas fa-angle-left" />
              </p>
              </Link>         
          </li>
        )}
        {/*Consultas*/}
        {["admin", "tecnico", "operaciones","soporte","finanzas"].includes(rol) && (
        <li className="nav-item">
          <Link to="/consulta-centro" className="nav-link">            
            <i className="nav-icon fas fa-search" />
            <p>
              Consultas Centro
            </p>
          </Link>
        </li>
        )}
       {/*soporte*/}
       {["admin", "soporte", "operaciones"].includes(rol) && (
        <li className="nav-item">
          <Link to="/soporte" className="nav-link">
            <i className="nav-icon fas fa-tools" />
            <p>
              Soporte
            </p>
          </Link>
        </li>  
        )}  

        {/*PROGRAMACION*/}  
        <li className="nav-header">PROGRAMACION</li>
        {["admin", "operaciones", "soporte"].includes(rol) && (
        <li className="nav-item">
        <Link to="/calendario" className="nav-link">
            <i className="nav-icon far fa-calendar-alt" />
            <p>
              Calendario              
            </p>
          </Link>
        </li>
        )}
        {/*historial de trabajos*/} 
        {["admin", "operaciones", "soporte"].includes(rol) && (
        <li className="nav-item">
              <Link to="/historial-trabajos" className="nav-link">
                <i className="nav-icon fas fa-history"></i>
                <p>
                    Historial de Trabajos
                </p>
              </Link>
        </li>
        )}
        <li className="nav-header">ADMINISTRACION</li>
        {/*historial por centro*/} 
        {["admin", "finanzas", "operaciones"].includes(rol) && (
        <li className="nav-item">
           <Link to="/historial-centro" className="nav-link">            
            <i className="nav-icon far fa-list-alt" aria-hidden="true"/>
            <p>
              Historial por centro              
            </p>
           </Link>
        </li>
        )}
        <li className="nav-header">REGISTROS</li>
        {/*Datos Ips*/} 
        {["admin", "operaciones", "soporte"].includes(rol) && (
        <li className="nav-item">
        <Link to="/datos-ip" className="nav-link">            
            <i className="nav-icon fas fa-network-wired" aria-hidden="true"/>
            <p>
              Datos Ip              
            </p>
          </Link>
        </li>
        )}
        {/*Clientes*/} 
        {["admin", "operaciones"].includes(rol) && (
        <li className="nav-item">
          <Link to="/clientes" className="nav-link">
            <i className="nav-icon fas fa-user-plus" />
            
            <p>
              Clientes              
            </p>
            </Link>       
        </li>
        )}
        {/*Centros*/}
        {["admin", "operaciones"].includes(rol) && (
        <li className="nav-item">
          <Link to="/centros" className="nav-link">
            <i className="nav-icon fas fa-folder-plus" />
            
            <p>
              Centros              
            </p>
            </Link>       
        </li>
        )}
        {/*Registro Actas*/}
        {["admin", "operaciones"].includes(rol) && (
        <li className="nav-item">
          <Link to="/registrosdocumentos" className="nav-link">
            <i className="nav-icon fas fa-folder-open" />
            
            
            <p>
              Registro Actas              
            </p>
            </Link>       
        </li>
        )}
        <li className="nav-header">USUARIOS</li>
        {/*Usuarios*/}
        {rol === "admin" && (
        <li className="nav-item">
            <Link to="/usuarios" className="nav-link">
                <i className="nav-icon fas fa-users"></i>
                <p>Usuarios</p>
              </Link>
        </li>
        )}
        {/*Tecnicos*/}
        {["admin", "operaciones"].includes(rol) && (
        <li className="nav-item">
            <Link to="/tecnicos" className="nav-link">
                <i className="nav-icon fas fa-address-book"></i>
                
                <p>Tecnicos</p>
              </Link>
        </li>
        )}
      </ul>
    </nav>
    {/* /.sidebar-menu */}
  </div>
  {/* /.sidebar */}
</aside>
    </div>
  );
}

export default SideNav;