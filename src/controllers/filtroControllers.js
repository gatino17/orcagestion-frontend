import { filtrarPorFecha, descargarDocumentofiltro, clientesFiltro  } from "../api";

export const obtenerDatosFiltrados = async (fechaInicio, fechaFin, clienteId) => {
    try {
        const datos = await filtrarPorFecha(fechaInicio, fechaFin, clienteId);
        return datos; // Opcional: Puedes procesar o transformar datos aquí si es necesario
    } catch (error) {
        console.error("Error en el controlador al obtener datos filtrados:", error);
        throw error;
    }
};



export const manejarDescarga = async (tipo, id) => {
    try {
        await descargarDocumentofiltro(tipo, id);
    } catch (error) {
        console.error("Error en el controlador al descargar el documento:", error);
        throw error;
    }
};

// Obtener lista de clientes para el filtro
export const obtenerClientesFiltro = async (setClientes, setError) => {
    try {
        const clientes = await clientesFiltro();
        setClientes(clientes);
    } catch (error) {
        console.error('Error al obtener clientes para el filtro:', error);
        setError('No se pudo cargar la lista de clientes para el filtro.');
    }
};