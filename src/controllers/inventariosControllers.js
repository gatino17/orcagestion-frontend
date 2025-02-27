import {
    cargarInventarios,
    guardarInventario,
    descargarDocumentoInventario,
    actualizarInventario,
    eliminarInventario,
} from '../api';

export const obtenerInventarios = async () => {
    try {
        return await cargarInventarios();
    } catch (error) {
        console.error('Error al obtener inventarios:', error);
        throw error;
    }
};

export const crearInventario = async (formData) => {
    try {
        return await guardarInventario(formData);
    } catch (error) {
        console.error('Error al crear inventario:', error);
        throw error;
    }
};

export const descargarInventarioDocumento = async (id) => {
    try {
        await descargarDocumentoInventario(id);
    } catch (error) {
        console.error('Error al descargar documento:', error);
        throw error;
    }
};

export const editarInventario = async (id, formData) => {
    try {
        return await actualizarInventario(id, formData);
    } catch (error) {
        console.error('Error al actualizar inventario:', error);
        throw error;
    }
};

export const eliminarInventarioPorId = async (id) => {
    try {
        return await eliminarInventario(id);
    } catch (error) {
        console.error('Error al eliminar inventario:', error);
        throw error;
    }
};
