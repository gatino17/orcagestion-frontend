import {
    cargarRetiros,
    guardarRetiro,
    descargarDocumento,
    actualizarRetiro,
    eliminarRetiro,
} from '../api';

export const obtenerRetiros = async () => {
    try {
        return await cargarRetiros();
    } catch (error) {
        console.error('Error al obtener retiros:', error);
        throw error;
    }
};

export const crearRetiro = async (formData) => {
    try {
        return await guardarRetiro(formData);
    } catch (error) {
        console.error('Error al crear retiro:', error);
        throw error;
    }
};

export const descargarRetiroDocumento = async (id) => {
    try {
        await descargarDocumento(id);
    } catch (error) {
        console.error('Error al descargar documento:', error);
        throw error;
    }
};

export const editarRetiro = async (id, formData) => {
    try {
        return await actualizarRetiro(id, formData);
    } catch (error) {
        console.error('Error al actualizar retiro:', error);
        throw error;
    }
};

export const eliminarRetiroPorId = async (id) => {
    try {
        return await eliminarRetiro(id);
    } catch (error) {
        console.error('Error al eliminar retiro:', error);
        throw error;
    }
};
