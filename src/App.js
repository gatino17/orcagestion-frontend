import React, { useEffect } from 'react';
//import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';


import './App.css';
import Header from "./components/Header";
import Footer from "./components/Footer";
import SideNav from "./components/SideNav";

//vistas
import Home from "./vistas/Home";
import Soporte from "./vistas/Soporte"; // Importa la nueva vista
import Clientes from "./vistas/Clientes"; // Importa la nueva vista
import Calendario from "./vistas/Calendario";
import HistorialTrabajos from "./vistas/HistorialTrabajos";
import HistorialCentro from "./vistas/HistorialCentro";
import DatosIP from "./vistas/DatosIP";
import ConsultaCentro from "./vistas/ConsultaCentro";
import Usuarios from "./vistas/Usuarios";

function App() {
    // Hook para manipular el `body` y agregar clases de AdminLTE
    useEffect(() => {
      document.body.classList.add('sidebar-mini', 'sidebar-collapse');
  
      // Cleanup: Remover las clases cuando el componente se desmonte, si es necesario
      return () => {
        document.body.classList.remove('sidebar-mini', 'sidebar-collapse');
      };
    }, []);
  return (
    <Router>
      <div className="wrapper">
        <Header />
        <SideNav />
        
        {/* Definir las rutas */}
        <div className="content-wrapper">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/soporte" element={<Soporte />} /> {/* Ruta para la vista de Soporte */}
            <Route path="/clientes" element={<Clientes />} /> 
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/historial-trabajos" element={<HistorialTrabajos />} />
            <Route path="/historial-centro" element={<HistorialCentro />} />
            <Route path="/datos-ip" element={<DatosIP />} />
            <Route path="/consulta-centro" element={<ConsultaCentro />} />
            <Route path="/usuarios" element={<Usuarios />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
