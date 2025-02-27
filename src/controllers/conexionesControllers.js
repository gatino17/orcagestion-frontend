import { obtenerConexiones, crearConexion, actualizarConexion, eliminarConexion } from '../api';

// Función para cargar todas las conexiones de un centro específico
// Dentro de conexionesControllers.js
export const cargarConexiones = async (centro_id, callback) => {
    try {
        const data = await obtenerConexiones(centro_id);
        console.log("Conexiones obtenidas del backend:", data); // Verifica los datos obtenidos
        callback(data);
    } catch (error) {
        console.error("Error al cargar conexiones:", error);
    }
};




export const agregarConexion = async (conexion, callback) => {
    try {
        const data = await crearConexion(conexion); // Llama a `crearConexion` con el objeto de datos `conexion`

        if (callback && typeof callback === "function") {
            // Llama al callback si está definido y es una función, pasando los datos devueltos
            callback(data);
        }

        return data; // También devuelve los datos para uso adicional si no hay callback
    } catch (error) {
        console.error("Error al agregar conexión:", error);
        throw error; // Lanza el error para que el código que llama a `agregarConexion` lo maneje si es necesario
    }
};

// Función para actualizar una conexión especial
export const modificarConexion = async (id, numero_conexion, callback) => {
    try {
        const data = await actualizarConexion(id, numero_conexion);
        callback(data);
    } catch (error) {
        console.error("Error al actualizar conexión:", error);
    }
};

// Función para eliminar una conexión especial
export const borrarConexion = async (id, callback) => {
    try {
        const data = await eliminarConexion(id);
        callback(data);
    } catch (error) {
        console.error("Error al eliminar conexión:", error);
    }
};


