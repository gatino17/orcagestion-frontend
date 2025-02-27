// src/controllers/encargadosControllers.js
import { obtenerEncargados, crearEncargado, actualizarEncargado, eliminarEncargado } from '../api';

export const cargarEncargados = async () => {
    try {
        const encargados = await obtenerEncargados();
        return encargados;
    } catch (error) {
        console.error("Error al cargar encargados:", error);
        throw error;
    }
};

export const agregarEncargado = async (encargadoData) => {
    try {
        const nuevoEncargado = await crearEncargado(encargadoData);
        return nuevoEncargado;
    } catch (error) {
        console.error("Error al agregar encargado:", error);
        throw error;
    }
};

export const modificarEncargado = async (id, encargadoData) => {
    try {
        const encargadoActualizado = await actualizarEncargado(id, encargadoData);
        return encargadoActualizado;
    } catch (error) {
        console.error("Error al modificar encargado:", error);
        throw error;
    }
};

export const borrarEncargado = async (id) => {
    try {
        const resultado = await eliminarEncargado(id);
        return resultado;
    } catch (error) {
        console.error("Error al borrar encargado:", error);
        throw error;
    }
};
