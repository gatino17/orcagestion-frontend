import {
    cargarServiciosAdicionales,
    crearServicioAdicional,
    actualizarServicioAdicional,
    eliminarServicioAdicional,
    descargarDocumentoServicioAdicional
} from '../api';

// Obtener todos los servicios adicionales
export const obtenerServiciosAdicionales = async (setServiciosAdicionales) => {
    try {
        const data = await cargarServiciosAdicionales();
        setServiciosAdicionales(data || []);
    } catch (error) {
        console.error('Error al cargar servicios adicionales:', error);
    }
};

// ✅ Crear un nuevo servicio adicional

export const agregarServicio = async (servicio, callback) => {
    const formData = new FormData();
    formData.append('id_razon_social', servicio.id_razon_social);
    formData.append('fecha_instalacion', servicio.fecha_instalacion);
    formData.append('observaciones', servicio.observaciones);        // Corregido
    
    if (servicio.documento_asociado) {  // Corregido
        formData.append('documento_asociado', servicio.documento_asociado);
    }

    console.log("FormData enviado al backend (crear):", Array.from(formData.entries()));

    try {
        const response = await crearServicioAdicional(formData);
        if (response && response.message === "Servicio adicional creado exitosamente") {
            if (typeof callback === 'function') callback();  // Recargar la lista de servicios si hay callback
            alert('Servicio adicional agregado exitosamente');
            return response;
        } else {
            console.error('Error al agregar servicio adicional:', response);
            throw new Error('Error inesperado al crear el servicio adicional');
        }
    } catch (error) {
        console.error('Error al agregar servicio adicional:', error.response ? error.response.data : error);
    }
};

// ✅ Modificar un servicio adicional existente
export const modificarServicio = async (id, servicio, callback) => {
    const formData = new FormData();

    // Solo agregar si el valor está definido y no es vacío
    if (servicio.id_razon_social) {
        formData.append('id_razon_social', servicio.id_razon_social);
    }
    
    if (servicio.fecha_instalacion) {
        formData.append('fecha_instalacion', servicio.fecha_instalacion);
    }
    
        
    if (servicio.observaciones) {
        formData.append('observaciones', servicio.observaciones);
    }
    
    if (servicio.documento_asociado) {
        formData.append('documento_asociado', servicio.documento_asociado);
    }

    console.log("FormData enviado al backend:", Array.from(formData.entries()));  // Verifica qué datos se están enviando

    try {
        await actualizarServicioAdicional(id, formData);

        if (typeof callback === 'function') {
            callback();  // Recargar los datos después de actualizar
        }

        alert('Servicio adicional actualizado exitosamente');
    } catch (error) {
        console.error('Error al actualizar servicio adicional:', error.response ? error.response.data : error);
    }
};







// Eliminar un servicio adicional

export const borrarServicio = async (id, callback) => {
    try {
        await eliminarServicioAdicional(id);
        callback(); // Llama a la función para recargar la lista de centros
    } catch (error) {
        console.error('Error al eliminar centro:', error);
    }
};


// Descargar documento asociado al servicio adicional
export const manejarDescargaDocumento = async (id) => {
    try {
        await descargarDocumentoServicioAdicional(id);
    } catch (error) {
        console.error('Error al descargar el documento del servicio adicional:', error);
    }
};
