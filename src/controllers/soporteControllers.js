import { obtenerSoportes, crearSoporte, actualizarSoporte, eliminarSoporte } from '../api';

export const cargarSoportes = async (setSoportes) => {
    try {
        const data = await obtenerSoportes();
        setSoportes(data);
    } catch (error) {
        console.error('Error al cargar los soportes:', error);
    }
};

export const agregarSoporte = async (soporteData, callback) => {
    try {
        const resultado = await crearSoporte(soporteData);
        await callback(resultado);
        return resultado;
    } catch (error) {
        console.error('Error al agregar soporte:', error);
        throw error;
    }
};

export const modificarSoporte = async (id, soporteData, callback) => {
    try {
        const resultado = await actualizarSoporte(id, soporteData);
        await callback(resultado);
        return resultado;
    } catch (error) {
        console.error('Error al actualizar soporte:', error);
        throw error;
    }
};

export const borrarSoporte = async (id, callback) => {
    try {
        await eliminarSoporte(id);
        callback();
    } catch (error) {
        console.error('Error al eliminar soporte:', error);
    }
};
