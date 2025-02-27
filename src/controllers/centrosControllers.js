// src/controllers/centrosControllers.js
import { obtenerCentros, crearCentro, actualizarCentro, eliminarCentro, obtenerDetallesCentro} from '../api';


/* Cargar todos los centros sin límite de registros
export const cargarDetallesCentro = async (centro_id, setCentroDetalles) => {
    try {
        const data = await obtenerDetallesCentro(centro_id);
        setCentroDetalles(data); // `data` ya contiene la información del centro
    } catch (error) {
        console.error('Error al cargar detalles del centro:', error);
    }
};*/
export const cargarDetallesCentro = async (centro_id) => {
    try {
        const data = await obtenerDetallesCentro(centro_id);
        return data; // Devuelve los datos directamente
    } catch (error) {
        console.error('Error al cargar detalles del centro:', error);
        throw error; // Lanza el error para que el código que llama a la función lo maneje
    }
};




// Cargar todos los centros sin límite de registros
export const cargarCentros = async (setCentros) => {
    try {
        // Aquí pasamos per_page: 0 para desactivar la paginación
        const data = await obtenerCentros({ per_page: 0 });
        setCentros(data.centros);
    } catch (error) {
        console.error('Error al cargar centros:', error);
    }
};

export const cargarCentrosClientes = async () => {
    try {
        const response = await obtenerCentros({ per_page: 0 });
        return response.centros;  // Ahora devuelve directamente el array de centros
    } catch (error) {
        console.error('Error al cargar centros:', error);
        return [];  // Devolver un array vacío en caso de error
    }
};



 //Agregar un nuevo centro
 export const agregarCentro = async (centro, callback) => {
    try {
        const response = await crearCentro(centro);
        // Verificar si la respuesta es exitosa (por ejemplo, si el código de estado es 201)
        if (response && response.message === "Centro creado exitosamente") {
            callback();  // Actualiza la vista después de la operación exitosa
            return response;
        } else {
            console.error('Error al agregar centro: Respuesta inesperada del servidor', response);
            throw new Error('Error inesperado al crear el centro');
        }
    } catch (error) {
        console.error('Error al agregar centro:', error);
        
    }
};



// Modificar un centro existente
export const modificarCentro = async (id, centro, callback) => {
    try {
        await actualizarCentro(id, centro);
        callback(); // Llama a la función para recargar la lista de centros
    } catch (error) {
        console.error('Error al actualizar centro:', error);
    }
};



// Eliminar un centro existente
export const borrarCentro = async (id, callback) => {
    try {
        await eliminarCentro(id);
        callback(); // Llama a la función para recargar la lista de centros
    } catch (error) {
        console.error('Error al eliminar centro:', error);
    }
};




