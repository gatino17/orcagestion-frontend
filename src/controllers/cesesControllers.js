import {
    cargarCeses,
    guardarCese,
    descargarDocumentoCese,
    actualizarCese,
    eliminarCese,
} from '../api';

export const obtenerCeses = async () => {
    try {
        return await cargarCeses();
    } catch (error) {
        console.error('Error al obtener ceses:', error);
        throw error;
    }
};

export const crearCese = async (formData) => {
    try {
        return await guardarCese(formData);
    } catch (error) {
        console.error('Error al crear cese:', error);
        throw error;
    }
};

export const descargarCeseDocumento = async (id) => {
    try {
        await descargarDocumentoCese(id);
    } catch (error) {
        console.error('Error al descargar documento:', error);
        throw error;
    }
};

export const editarCese = async (id, formData) => {
    try {
        return await actualizarCese(id, formData);
    } catch (error) {
        console.error('Error al actualizar cese:', error);
        throw error;
    }
};

export const eliminarCesePorId = async (id) => {
    try {
        return await eliminarCese(id);
    } catch (error) {
        console.error('Error al eliminar cese:', error);
        throw error;
    }
};
