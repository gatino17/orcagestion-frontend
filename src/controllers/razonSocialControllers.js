import { obtenerRazonesSociales, crearRazonSocial, actualizarRazonSocial, eliminarRazonSocial, obtenerTodasRazonesSociales } from '../api';

// Función para cargar todas las razones sociales y actualizar el estado
export const cargarRazonesSociales = async (setRazonesSociales, page = 1, perPage = 5) => {
    try {
        const response = await obtenerRazonesSociales(page, perPage);
        setRazonesSociales(response.razones_sociales);
    } catch (error) {
        console.error('Error al cargar razones sociales:', error);
    }
};

// Función para agregar una nueva razón social y actualizar la vista
export const agregarRazonSocial = async (razonSocial, callback) => {
    try {
        await crearRazonSocial(razonSocial);
        callback(); // Llama a la función para actualizar la vista (por ejemplo, cargarRazonesSociales)
    } catch (error) {
        console.error('Error al agregar razón social:', error);
    }
};

// Función para actualizar una razón social existente y recargar la lista
export const modificarRazonSocial = async (id, razonSocial, callback) => {
    try {
        await actualizarRazonSocial(id, razonSocial);
        callback(); // Llama a la función para recargar la lista de razones sociales
    } catch (error) {
        console.error('Error al actualizar razón social:', error);
    }
};

// Función para eliminar una razón social y recargar la lista
export const borrarRazonSocial = async (id, callback) => {
    try {
        await eliminarRazonSocial(id);
        callback(); // Llama a la función para recargar la lista de razones sociales
    } catch (error) {
        console.error('Error al eliminar razón social:', error);
    }
};


 

// Función para cargar todas las razones sociales sin paginación y actualizar el estado
export const cargarTodasRazonesSociales = async (setRazonesSociales) => {
    try {
        const razonesSociales = await obtenerTodasRazonesSociales();
        setRazonesSociales(razonesSociales);
    } catch (error) {
        console.error('Error al cargar todas las razones sociales:', error);
    }
};

