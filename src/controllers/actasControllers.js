import { 
    obtenerActas,
    obtenerLevantamientosActas, 
    registrarLevantamientoActas, 
    modificarLevantamientoActas, 
    borrarLevantamientoActas, 

    obtenerInventariosActas, 
    registrarInventarioActas, 
    modificarInventarioActas, 
    borrarInventarioActas,
    borrarLevantamientosPorCentro,
    borrarInventariosPorCentro,

    obtenerCesesActas,
    modificarCeseActas,
    registrarCeseActas,
    borrarCesesPorCentro,

    obtenerRetirosActas,
    registrarRetiroActas,
    modificarRetiroActas,
    borrarRetirosPorCentro,

    obtenerTrasladosActas,
    registrarTrasladoActas,
    modificarTrasladoActas,
    borrarTrasladosPorCentro,

    obtenerInstalacionesActas,     // ➤ IMPORTAR funciones de instalaciones
    registrarInstalacionActas,
    modificarInstalacionActas,
    borrarInstalacionesPorCentro,
    obtenerActasEntrega,
    obtenerPermisosTrabajo,

    obtenerMantencionesActas, 
    registrarMantencionActas, 
    modificarMantencionActas, 
    borrarMantencionPorId,
    descargarDocumentoMantencionActas,
    obtenerMantencionesTerreno    

    
} from '../api';
import { descargarDocumentofiltro, clientesFiltro  } from "../api";
import { obtenerCentros } from '../api';
import { obtenerClientes } from '../api';

// Cargar todas las actas con filtros opcionales
export const cargarActas = async (setActividades, setServiciosAdicionales, filtros = {}) => {
    try {
        console.log("📡 Filtros antes de envío:", filtros);
      
        // 🛠 Convertimos id_centro en nombre_centro si es necesario
        const filtrosConvertidos = {
            cliente_id: filtros.id_cliente || filtros.cliente_id,
            nombre_centro: filtros.nombre_centro || filtros.id_centro,  // ✅ Aseguramos que el nombre se use en vez del ID
        };

        console.log("🚀 Filtros enviados a API:", filtrosConvertidos);
        const data = await obtenerActas(filtrosConvertidos);

        if (data.actividades) {
            setActividades(data.actividades);
        } else {
            setActividades([]);
            console.warn("⚠ No se encontraron actividades");
        }

        if (data.servicios_adicionales) {
            setServiciosAdicionales(data.servicios_adicionales);
        } else {
            setServiciosAdicionales([]);
            console.warn("⚠ No se encontraron servicios adicionales");
        }

    } catch (error) {
        console.error("❌ Error al cargar actas:", error);
    }
};

// Función para cargar centros desde el controlador
export const cargarCentrosActas = async (setCentros) => {
    try {
        const response = await obtenerCentros();
        console.log("Respuesta de centros desde la API:", response);

        if (response && Array.isArray(response.centros)) {
            setCentros(response.centros);  // Asignamos el array correctamente
        } else {
            setCentros([]);  // Fallback en caso de que no sea un array
        }
    } catch (error) {
        console.error("Error al cargar centros:", error);
        setCentros([]);  // Siempre aseguramos un array, incluso en caso de error
    }
};

//### levantamiento ###//
// Cargar levantamientos asociados a un centro específico
export const cargarLevantamientosActas = async (setLevantamientos, centroId = null) => {
    try {
        const data = await obtenerLevantamientosActas(centroId);
        setLevantamientos(data || []);
    } catch (error) {
        console.error("Error al cargar levantamientos:", error);
    }
};

// Cargar inventarios asociados a un centro específico
export const cargarInventariosActas = async (setInventarios, centroId = null) => {
    try {
        const data = await obtenerInventariosActas(centroId);
        setInventarios(data || []);
    } catch (error) {
        console.error("Error al cargar inventarios:", error);
    }
};

// Guardar o editar un levantamiento
export const guardarLevantamientoActas = async (formData, id = null) => {
    try {
        if (id) {
            await modificarLevantamientoActas(id, formData);
        } else {
            await registrarLevantamientoActas(formData);
        }
        return { success: true };
    } catch (error) {
        console.error("Error al guardar levantamiento:", error);
        return { success: false, error };
    }
};

// Guardar o editar un inventario
export const guardarInventarioActas = async (formData, id = null) => {
    try {
        if (id) {
            await modificarInventarioActas(id, formData);
        } else {
            await registrarInventarioActas(formData);
        }
        return { success: true };
    } catch (error) {
        console.error("Error al guardar inventario:", error);
        return { success: false, error };
    }
};

// Eliminar un levantamiento
export const eliminarLevantamientoActas = async (id) => {
    try {
        await borrarLevantamientoActas(id);
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar levantamiento:", error);
        return { success: false, error };
    }
};
// Eliminar un levantamiento por centro
export const eliminarLevantamientosPorCentro = async (centroId) => {
    try {
        await borrarLevantamientosPorCentro(centroId);
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar levantamientos por centro:", error);
        return { success: false, error };
    }
};
//### inventario ###//
// Eliminar un inventario
export const eliminarInventarioActas = async (id) => {
    try {
        await borrarInventarioActas(id);
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar inventario:", error);
        return { success: false, error };
    }
};
// Eliminar inventario por centro
export const eliminarInventariosPorCentro = async (centroId) => {
    try {
        await borrarInventariosPorCentro(centroId);
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar inventarios por centro:", error);
        return { success: false, error };
    }
};


export const manejarDescarga = async (tipo, id) => {
    try {
        await descargarDocumentofiltro(tipo, id);
    } catch (error) {
        console.error("Error en el controlador al descargar el documento:", error);
        throw error;
    }
};

// Obtener lista de clientes para el filtro
export const obtenerClientesFiltro = async (setClientes, setError) => {
    try {
        const clientes = await clientesFiltro();
        setClientes(clientes);
    } catch (error) {
        console.error('Error al obtener clientes para el filtro:', error);
        setError('No se pudo cargar la lista de clientes para el filtro.');
    }
};

//############################## ceses ##############################//
// ➤ Cargar ceses asociados a un centro específico
export const cargarCesesActas = async (setCeses, centroId = null) => {
    try {
        const data = await obtenerCesesActas(centroId);
        setCeses(data || []);
    } catch (error) {
        console.error("Error al cargar ceses:", error);
    }
};

// ➤ Guardar o editar un cese
export const guardarCeseActas = async (formData, id = null) => {
    try {
        if (id) {
            await modificarCeseActas(id, formData);
        } else {
            await registrarCeseActas(formData);
        }
        return { success: true };
    } catch (error) {
        console.error("Error al guardar cese:", error);
        return { success: false, error };
    }
};

// ➤ Eliminar todos los ceses asociados a un centro específico
export const eliminarCesesPorCentro = async (centroId) => {
    try {
        await borrarCesesPorCentro(centroId);
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar ceses por centro:", error);
        return { success: false, error };
    }
};

//############################## retiros ##############################//
export const cargarRetirosActas = async (setRetiros, centroId = null) => {
    try {
        const data = await obtenerRetirosActas(centroId);
        setRetiros(data || []);
    } catch (error) {
        console.error("Error al cargar retiros:", error);
    }
};

export const guardarRetiroActas = async (formData, id = null) => {
    try {
        if (id) {
            await modificarRetiroActas(id, formData);
        } else {
            await registrarRetiroActas(formData);
        }
        return { success: true };
    } catch (error) {
        console.error("Error al guardar retiro:", error);
        return { success: false, error };
    }
};

export const eliminarRetirosPorCentro = async (centroId) => {
    try {
        await borrarRetirosPorCentro(centroId);
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar retiros por centro:", error);
        return { success: false, error };
    }
};

//############################## traslados ##############################//

export const cargarTrasladosActas = async (setTraslados, centroId = null) => {
    try {
        const data = await obtenerTrasladosActas(centroId);
        setTraslados(data || []);
    } catch (error) {
        console.error("Error al cargar traslados:", error);
    }
};

export const guardarTrasladoActas = async (formData, id = null) => {
    try {
        if (id) {
            await modificarTrasladoActas(id, formData);
        } else {
            await registrarTrasladoActas(formData);
        }
        return { success: true };
    } catch (error) {
        console.error("Error al guardar traslado:", error);
        return { success: false, error };
    }
};

export const eliminarTrasladosPorCentro = async (centroId) => {
    try {
        await borrarTrasladosPorCentro(centroId);
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar traslados por centro:", error);
        return { success: false, error };
    }
};


//############################## instalaciones ##############################//


// ➤ Cargar instalaciones asociadas a un centro específico
export const cargarInstalacionesActas = async (setInstalaciones, centroId = null) => {
    try {
        const data = await obtenerInstalacionesActas(centroId);
        setInstalaciones(data || []);
    } catch (error) {
        console.error("Error al cargar instalaciones:", error);
    }
};

export const cargarActasEntregaSistema = async (setActasEntrega, centroId = null) => {
    try {
        const data = await obtenerActasEntrega(centroId ? { centro_id: centroId } : {});
        setActasEntrega(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error("Error al cargar actas de entrega del sistema:", error);
        setActasEntrega([]);
    }
};

export const cargarPermisosTrabajoSistema = async (setPermisosTrabajo, centroId = null) => {
    try {
        const data = await obtenerPermisosTrabajo(centroId ? { centro_id: centroId } : {});
        setPermisosTrabajo(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error("Error al cargar permisos de trabajo del sistema:", error);
        setPermisosTrabajo([]);
    }
};

// ➤ Guardar o editar una instalación
export const guardarInstalacionActas = async (formData, id = null) => {
    try {
        if (id) {
            await modificarInstalacionActas(id, formData);
        } else {
            await registrarInstalacionActas(formData);
        }
        return { success: true };
    } catch (error) {
        console.error("Error al guardar instalación:", error);
        return { success: false, error };
    }
};

// ➤ Eliminar todas las instalaciones asociadas a un centro específico
export const eliminarInstalacionesPorCentro = async (centroId) => {
    try {
        await borrarInstalacionesPorCentro(centroId);
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar instalaciones por centro:", error);
        return { success: false, error };
    }
};

//############################## mantencion ##############################//

// ➤ Cargar mantenciones asociadas a un centro específico
export const cargarMantencionesActas = async (setMantenciones, centroId = null) => {
    try {
        const data = await obtenerMantencionesActas(centroId);
        setMantenciones(data || []);
    } catch (error) {
        console.error("Error al cargar mantenciones:", error);
    }
};

export const cargarMantencionesSistema = async (setMantencionesSistema, centroId = null) => {
    try {
        const data = await obtenerMantencionesTerreno(centroId ? { centro_id: centroId } : {});
        setMantencionesSistema(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error("Error al cargar mantenciones del sistema:", error);
        setMantencionesSistema([]);
    }
};

// ➤ Guardar o editar una mantención
export const guardarMantencionActas = async (formData, id = null) => {
    try {
        if (id) {
            await modificarMantencionActas(id, formData);
        } else {
            await registrarMantencionActas(formData);
        }
        return { success: true };
    } catch (error) {
        console.error("Error al guardar mantención:", error);
        return { success: false, error };
    }
};

// ➤ Eliminar todas las mantenciones asociadas a un centro específico
//export const eliminarMantencionesPorCentro = async (centroId) => {
 //   try {
 //       await borrarMantencionesPorCentro(centroId);
 //       return { success: true };
 //   } catch (error) {
 //       console.error("Error al eliminar mantenciones por centro:", error);
 //       return { success: false, error };
//    }
//};

export const eliminarMantencionActas = async (idMantencion) => {
    try {
        const response = await borrarMantencionPorId(idMantencion);
        return { success: true, data: response };
    } catch (error) {
        console.error("Error al eliminar la mantención:", error);
        return { success: false, error };
    }
};

// ➤ Descargar documento de una mantención específica
export const verDocumentoMantencionActas = async (idMantencion) => {
    try {
        await descargarDocumentoMantencionActas(idMantencion);
    } catch (error) {
        console.error("Error al visualizar el documento de la mantención:", error);
        alert("No se pudo visualizar el documento de la mantención.");
    }
};

///####################### Endpoint cliente ######################################

export const cargarClientes = async (setClientes) => {
    try {
        const listaClientes = await obtenerClientes();
        
        if (Array.isArray(listaClientes)) {
            setClientes(listaClientes);
        } else {
            console.error("La API no devolvió un array válido:", listaClientes);
            setClientes([]); // Evita errores si la API responde con datos inesperados
        }
    } catch (error) {
        console.error("Error al obtener clientes:", error);
        setClientes([]); // Evita que el estado quede undefined
    }
};
