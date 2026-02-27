import { obtenerEquipos, crearEquipo, actualizarEquipo, eliminarEquipo } from '../api';

// Función para cargar equipos de un centro específico
export const cargarEquipos = async (centro_id, callback) => {
    try {
        const data = await obtenerEquipos(centro_id);
        callback?.(data);
        return data;
    } catch (error) {
        console.error("Error al cargar equipos:", error);
        throw error;
    }
};

// Función para agregar un nuevo equipo
export const agregarEquipo = async (equipo, callback) => {
    try {
        const data = await crearEquipo(equipo);
        callback?.(data);
        return data;
    } catch (error) {
        console.error("Error al agregar equipo:", error);
        throw error;
    }
};

// Función para actualizar un equipo
export const modificarEquipo = async (id_equipo, equipoData, callback) => {
    try {
        const data = await actualizarEquipo(id_equipo, equipoData);
        callback?.(data);
        return data;
    } catch (error) {
        console.error("Error al actualizar equipo:", error);
        throw error;
    }
};

// Función para eliminar un equipo
export const borrarEquipo = async (id_equipo, callback) => {
    try {
        const data = await eliminarEquipo(id_equipo);
        callback?.(data);
        return data;
    } catch (error) {
        console.error("Error al eliminar equipo:", error);
        throw error;
    }
};
