import React, {} from "react";
import { Link } from 'react-router-dom';



function SideNav() {
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
      <div className="image">
        <img src="dist/img/user2-160x160.jpg" className="img-circle elevation-2" alt="User Image" />
      </div>
      <div className="info">
        <a href="#" className="d-block">Alexander Pierce</a>
      </div>
    </div>   
    
    {/* Sidebar Menu */}
    <nav className="mt-2">
      <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
        {/* Add icons to the links using the .nav-icon class
         with font-awesome or any other icon font library */}
        <li className="nav-item menu-open">
        <Link to="/" className="nav-link">
            <i className="nav-icon fas fa-home" />
            <p>
              Inicio
              <i className="right fas fa-angle-left" />
            </p>
            </Link>         
        </li>
        {/*Consultas*/}

        <li className="nav-item">
          <Link to="/consulta-centro" className="nav-link">            
            <i className="nav-icon fas fa-search" />
            <p>
              Consultas
            </p>
          </Link>
        </li>
       {/*soporte*/}
        <li className="nav-item">
          <Link to="/soporte" className="nav-link">
            <i className="nav-icon fas fa-tools" />
            <p>
              Soporte
            </p>
          </Link>
        </li>        
        <li className="nav-header">PROGRAMACION</li>
        <li className="nav-item">
        <Link to="/calendario" className="nav-link">
            <i className="nav-icon far fa-calendar-alt" />
            <p>
              Calendario              
            </p>
          </Link>
        </li>
        <li className="nav-item">
              <Link to="/historial-trabajos" className="nav-link">
                <i className="nav-icon fas fa-history"></i>
                <p>
                    Historial de Trabajos
                </p>
              </Link>
        </li>
        <li className="nav-header">ADMINISTRACION</li>
        <li className="nav-item">
           <Link to="/historial-centro" className="nav-link">            
            <i className="nav-icon far fa-list-alt" aria-hidden="true"/>
            <p>
              Historial por centro              
            </p>
           </Link>
        </li>
        <li className="nav-header">REGISTROS</li>
        <li className="nav-item">
        <Link to="/datos-ip" className="nav-link">            
            <i className="nav-icon fas fa-network-wired" aria-hidden="true"/>
            <p>
              Datos Ip              
            </p>
          </Link>
        </li>
        <li className="nav-item">
          <Link to="/clientes" className="nav-link">
            <i className="nav-icon fas fa-copy" />
            <p>
              Clientes              
            </p>
            </Link>       
        </li>
        <li className="nav-header">USUARIOS</li>
        <li className="nav-item">
            <Link to="/usuarios" className="nav-link">
                <i className="nav-icon fas fa-users"></i>
                <p>Usuarios</p>
              </Link>
        </li>
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