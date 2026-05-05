// src/api.js
import axios from 'axios';

// Resuelve la base de API sin provocar mixed-content:
// - Preferimos REACT_APP_API_BASE_URL si existe.
// - En localhost usamos http://localhost:5000/api (dev).
// - En producción usamos el mismo origen + /api (detrás de proxy).
// - Si la página está en https y BASE_URL apunta a http, lo corregimos a https.
const isBrowser = typeof window !== "undefined";
const envBase = process.env.REACT_APP_API_BASE_URL;

let BASE_URL = "/api"; // default para build estático

if (isBrowser && window.location.hostname === "localhost") {
    BASE_URL = "http://localhost:5000/api";
}

if (envBase) {
    BASE_URL = envBase;
}

if (isBrowser) {
    if (!envBase && window.location.hostname !== "localhost") {
        BASE_URL = `${window.location.protocol}//${window.location.host}/api`;
    }
    if (window.location.protocol === "https:" && BASE_URL.startsWith("http://")) {
        BASE_URL = BASE_URL.replace("http://", "https://");
    }
}

export const loginUsuario = async (credenciales) => {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, credenciales);
        return response.data; // Devuelve el token y/o mensaje
    } catch (error) {
        console.error('Error al iniciar sesión:', error.response?.data || error.message);
        throw error;
    }
};


export const obtenerUsuarios = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/users/`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const crearUsuario = async (usuario) => {
    try {
        const response = await axios.post(`${BASE_URL}/users/`, usuario);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Más funciones como actualizarUsuario, eliminarUsuario, etc.
// Función para actualizar un usuario existente
export const actualizarUsuario = async (id, usuario) => {
    try {
        const response = await axios.put(`${BASE_URL}/users/${id}`, usuario);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Función para eliminar un usuario
export const eliminarUsuario = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/users/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};



// Obtener todos los clientes
export const obtenerClientes = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/clientes/`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Crear un nuevo cliente
export const crearCliente = async (cliente) => {
    try {
        const response = await axios.post(`${BASE_URL}/clientes/`, cliente);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar un cliente existente
export const actualizarCliente = async (id, cliente) => {
    try {
        const response = await axios.put(`${BASE_URL}/clientes/${id}`, cliente);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar un cliente existente
export const eliminarCliente = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/clientes/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};



// Obtener todas las razones sociales con paginación
export const obtenerRazonesSociales = async (page = 1, perPage = 5) => {
    try {
        const response = await axios.get(`${BASE_URL}/razones_sociales/?page=${page}&per_page=${perPage}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Obtener todas las razones sociales sin paginación
export const obtenerTodasRazonesSociales = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/razones_sociales/all`); // Ruta sin paginación
        return response.data.razones_sociales;
    } catch (error) {
        throw error;
    }
};


// Crear una nueva razón social
export const crearRazonSocial = async (razonSocial) => {
    try {
        const response = await axios.post(`${BASE_URL}/razones_sociales/`, razonSocial);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar una razón social existente
export const actualizarRazonSocial = async (id, razonSocial) => {
    try {
        const response = await axios.put(`${BASE_URL}/razones_sociales/${id}`, razonSocial);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar una razón social existente
export const eliminarRazonSocial = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/razones_sociales/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

//centros
// Obtener todos los centros con parámetros opcionales para filtrado, paginación y ordenamiento
export const obtenerCentros = async (params = { page: 1, per_page: 15, sort_by: 'created_at', sort_order: 'asc' }) => {
    try {
        // Aplicar valores por defecto si no están presentes en params
        const response = await axios.get(`${BASE_URL}/centros`, { params });
        return response.data;
    } catch (error) {
        console.error('Error al obtener centros:', error);
        throw error;
    }
};


// Crear un nuevo centro
export const crearCentro = async (centro) => {
    try {
        const response = await axios.post(`${BASE_URL}/centros/`, centro);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar un centro existente
export const actualizarCentro = async (id, centro) => {
    try {
        const response = await axios.put(`${BASE_URL}/centros/${id}`, centro);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar un centro existente
export const eliminarCentro = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/centros/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};


// Obtener conexiones especiales, con opción de filtrar por `centro_id`
export const obtenerConexiones = async (centro_id) => {
    try {
        const response = await axios.get(`${BASE_URL}/conexiones`, { params: { centro_id } });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Crear una nueva conexión especial
export const crearConexion = async (conexion) => {
    try {
        const response = await axios.post(`${BASE_URL}/conexiones/`, conexion);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar una conexión especial por `id`
export const actualizarConexion = async (id, numero_conexion) => {
    try {
        const response = await axios.put(`${BASE_URL}/conexiones/${id}`, { numero_conexion });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar una conexión especial por `id`
export const eliminarConexion = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/conexiones/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};


// Obtener equipos, con opción de filtrar por `centro_id`
export const obtenerEquipos = async (centro_id) => {
    try {
        const response = await axios.get(`${BASE_URL}/equipos`, { params: { centro_id } });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Crear un nuevo equipo
export const crearEquipo = async (equipo) => {
    try {
        const response = await axios.post(`${BASE_URL}/equipos/`, equipo);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar un equipo por `id`
export const actualizarEquipo = async (id_equipo, equipoData) => {
    try {
        const response = await axios.put(`${BASE_URL}/equipos/${id_equipo}`, equipoData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const obtenerRoles = async () => {
    const response = await axios.get(`${BASE_URL}/roles/`);
    return response.data;
};

export const obtenerPaginasRol = async () => {
    const response = await axios.get(`${BASE_URL}/roles/pages`);
    return response.data;
};

export const crearRol = async (payload) => {
    const response = await axios.post(`${BASE_URL}/roles/`, payload);
    return response.data;
};

export const actualizarRol = async (idRole, payload) => {
    const response = await axios.put(`${BASE_URL}/roles/${idRole}`, payload);
    return response.data;
};

export const validarSerieEquipo = async (numero_serie, params = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/equipos/validar-serie`, {
            params: { numero_serie, ...params },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar un equipo por `id`
export const eliminarEquipo = async (id_equipo) => {
    try {
        const response = await axios.delete(`${BASE_URL}/equipos/${id_equipo}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Obtener detalles del centro por id o nombre
export const obtenerDetallesCentro = async (filtro) => {
    try {
        const params = {};
        if (typeof filtro === "number") {
            params.centro_id = filtro;
        } else if (typeof filtro === "string") {
            params.nombre = filtro;
        } else if (filtro && typeof filtro === "object") {
            if (filtro.centro_id) params.centro_id = filtro.centro_id;
            if (filtro.nombre) params.nombre = filtro.nombre;
        }
        const response = await axios.get(`${BASE_URL}/centros/detalles`, { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Función para obtener todos los encargados
export const obtenerEncargados = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/encargados/`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Función para crear un nuevo encargado
export const crearEncargado = async (encargado) => {
    try {
        const response = await axios.post(`${BASE_URL}/encargados/`, encargado);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Función para actualizar un encargado existente
export const actualizarEncargado = async (id, encargado) => {
    try {
        const response = await axios.put(`${BASE_URL}/encargados/${id}`, encargado);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Función para eliminar un encargado
export const eliminarEncargado = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/encargados/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// funcion crear
export const crearActividad = async (actividadData) => {
    try {
        const response = await axios.post(`${BASE_URL}/actividades/`, actividadData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const obtenerActividades = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/actividades/`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const actualizarActividad = async (id, actividadData) => {
    try {
        const response = await axios.put(`${BASE_URL}/actividades/${id}`, actividadData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar una actividad por ID
export const eliminarActividad = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/actividades/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// tabla retiros conexion con backend
// Obtener todos los retiros o filtrar por `centro_id`
// Cargar retiros
export const cargarRetiros = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/retiros`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Crear un nuevo retiro
export const guardarRetiro = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/retiros`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar un retiro existente
export const actualizarRetiro = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/retiros/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    };
};

// Eliminar un retiro por ID
export const eliminarRetiro = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/retiros/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Descargar documento asociado al retiro
export const descargarDocumento = async (id) => {
    try {
        const response = await axios.get(`${BASE_URL}/retiros/${id}/documento`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', response.headers['content-disposition'].split('filename=')[1]);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        throw error;
    }
};

// Tabla ceses Cargar ceses
export const cargarCeses = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/ceses`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Crear un nuevo cese
export const guardarCese = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/ceses`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar un cese existente
export const actualizarCese = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/ceses/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar un cese por ID
export const eliminarCese = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/ceses/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Descargar documento asociado al cese
export const descargarDocumentoCese = async (id) => {
    try {
        const response = await axios.get(`${BASE_URL}/ceses/${id}/documento`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', response.headers['content-disposition']?.split('filename=')[1] || `documento_cese_${id}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        throw error;
    }
};

// Tabla inventarios

// Cargar inventarios
export const cargarInventarios = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/inventarios`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Crear un nuevo inventario
export const guardarInventario = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/inventarios`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar un inventario existente
export const actualizarInventario = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/inventarios/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar un inventario por ID
export const eliminarInventario = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/inventarios/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Descargar documento asociado al inventario
export const descargarDocumentoInventario = async (id) => {
    try {
        const response = await axios.get(`${BASE_URL}/inventarios/${id}/documento`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', response.headers['content-disposition']?.split('filename=')[1] || `documento_inventario_${id}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        throw error;
    }
};


// Cargar todos los traslados
export const cargarTraslados = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/traslados`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Crear un nuevo traslado
export const guardarTraslado = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/traslados`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar un traslado existente
export const actualizarTraslado = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/traslados/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar un traslado por ID
export const eliminarTraslado = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/traslados/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Descargar el documento asociado a un traslado
export const descargarDocumentoTraslado = async (id) => {
    try {
        const response = await axios.get(`${BASE_URL}/traslados/${id}/documento`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', response.headers['content-disposition']?.split('filename=')[1] || `documento_traslado_${id}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        throw error;
    }
};

// Cargar instalaciones nuevas
export const cargarInstalaciones = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/instalaciones`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Crear una nueva instalación
export const guardarInstalacion = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/instalaciones`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar una instalación existente
export const actualizarInstalacion = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/instalaciones/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar una instalación por ID
export const eliminarInstalacion = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/instalaciones/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Descargar documento asociado a la instalación
export const descargarDocumentoInstalacion = async (id) => {
    try {
        const response = await axios.get(`${BASE_URL}/instalaciones/${id}/documento`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', response.headers['content-disposition']?.split('filename=')[1] || `documento_instalacion_${id}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        throw error;
    }
};

// Cargar servicios adicionales
export const cargarServiciosAdicionales = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/servicios_adicionales`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Crear un nuevo servicio adicional
export const crearServicioAdicional = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/servicios_adicionales`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar un servicio adicional existente
export const actualizarServicioAdicional = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/servicios_adicionales/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar un servicio adicional por ID
export const eliminarServicioAdicional = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/servicios_adicionales/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Descargar documento asociado al servicio adicional
export const descargarDocumentoServicioAdicional = async (id) => {
    try {
        const response = await axios.get(`${BASE_URL}/servicios_adicionales/${id}/documento`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', response.headers['content-disposition']?.split('filename=')[1] || `documento_servicio_${id}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        throw error;
    }
};

// Cargar levantamientos
export const cargarLevantamientos = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/levantamientos`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Crear un nuevo levantamiento
export const guardarLevantamiento = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/levantamientos`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar un levantamiento existente
export const actualizarLevantamiento = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/levantamientos/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar un levantamiento por ID
export const eliminarLevantamiento = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/levantamientos/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Descargar documento asociado al levantamiento
export const descargarDocumentoLevantamiento = async (id) => {
    try {
        const response = await axios.get(`${BASE_URL}/levantamientos/${id}/documento`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', response.headers['content-disposition']?.split('filename=')[1] || `documento_levantamiento_${id}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        throw error;
    }
};

// Cargar mantenciones
export const cargarMantenciones = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/mantenciones`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Crear una nueva mantención
export const guardarMantencion = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/mantenciones`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar una mantención existente
export const actualizarMantencion = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/mantenciones/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar una mantención por ID
export const eliminarMantencion = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/mantenciones/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Descargar documento asociado a la mantención
export const descargarDocumentoMantencion = async (id) => {
    try {
        const response = await axios.get(`${BASE_URL}/mantenciones/${id}/documento`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', response.headers['content-disposition']?.split('filename=')[1] || `documento_mantencion_${id}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        throw error;
    }
};


// Obtener lista de clientes para el filtro(conexion filtro_routes.py)
export const clientesFiltro = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/clientes`);
        return response.data; // Lista de clientes [{ id: 1, nombre: 'Cliente 1' }, ...]
    } catch (error) {
        console.error('Error al obtener los clientes para el filtro:', error);
        throw error;
    }
};

// Conexión para obtener datos filtrados por rango de fechas y cliente
export const filtrarPorFecha = async (fechaInicio, fechaFin, clienteId = null) => {
    try {
        const response = await axios.get(`${BASE_URL}/filtro/filtrar`, {
            params: { 
                fecha_inicio: fechaInicio, 
                fecha_fin: fechaFin, 
                cliente_id: clienteId // Agregar clienteId al request
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error al filtrar datos:', error);
        throw error;
    }
};

// Descargar o visualizar documento asociado al filtro
export const descargarDocumentofiltro = async (tipo, id) => {
    try {
        const response = await axios.get(`${BASE_URL}/filtro/documento/${tipo}/${id}`, {
            responseType: 'blob',
        });

        const contentType = response.headers['content-type'];
        const url = window.URL.createObjectURL(new Blob([response.data]));

        if (contentType.includes('application/pdf')) {
            window.open(url, '_blank');
        } else if (contentType.includes('image')) {
            window.open(url, '_blank');
        } else {
            console.error("Tipo de archivo no soportado:", contentType);
        }
    } catch (error) {
        console.error("Error al descargar el documento:", error);
        throw error;
    }
};


// Obtener todos los datos de actas con filtros
export const obtenerActas = async (filtros = {}) => {
    try {
        console.log("Enviando filtros:", filtros);
        const response = await axios.get(`${BASE_URL}/actas/listar`, {
            params: filtros,
        });
        console.log("Respuesta recibida:", response.data); // Log para depuración
        return response.data;
    } catch (error) {
        console.error("Error al obtener actas:", error);
        throw new Error("No se pudieron cargar las actas. Por favor, inténtelo más tarde.");
    }
};


// ➤ OBTENER Levantamientos desde Actas
export const obtenerLevantamientosActas = async (centroId) => {
    try {
        const response = await axios.get(`${BASE_URL}/actas/levantamientos`, {
            params: centroId ? { centro_id: centroId } : {},
        });
        return response.data;
    } catch (error) {
        console.error("Error al obtener levantamientos:", error);
        throw new Error("No se pudieron cargar los levantamientos.");
    }
};

// ➤ CREAR Levantamiento desde Actas
export const registrarLevantamientoActas = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/actas/levantamientos`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al crear levantamiento:", error);
        throw error;
    }
};

// ➤ EDITAR Levantamiento desde Actas
export const modificarLevantamientoActas = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/actas/levantamientos/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al actualizar levantamiento:", error);
        throw error;
    }
};

// ➤ ELIMINAR Levantamiento desde Actas
export const borrarLevantamientoActas = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/actas/levantamientos/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar levantamiento:", error);
        throw error;
    }
};

// ➤ ELIMINAR Levantamientos por centro desde Actas
export const borrarLevantamientosPorCentro = async (centroId) => {
    try {
        const response = await axios.delete(`${BASE_URL}/actas/eliminar_por_centro/${centroId}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar levantamientos del centro:", error);
        throw error;
    }
};


// ➤ OBTENER Inventarios desde Actas
export const obtenerInventariosActas = async (centroId) => {
    try {
        const response = await axios.get(`${BASE_URL}/actas/inventarios`, {
            params: centroId ? { centro_id: centroId } : {},
        });
        return response.data;
    } catch (error) {
        console.error("Error al obtener inventarios:", error);
        throw new Error("No se pudieron cargar los inventarios.");
    }
};

// ➤ CREAR Inventario desde Actas
export const registrarInventarioActas = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/actas/inventarios`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al crear inventario:", error);
        throw error;
    }
};

// ➤ EDITAR Inventario desde Actas
export const modificarInventarioActas = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/actas/inventarios/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al actualizar inventario:", error);
        throw error;
    }
};

// ➤ ELIMINAR Inventario desde Actas
export const borrarInventarioActas = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/actas/inventarios/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar inventario:", error);
        throw error;
    }
};

// ➤ ELIMINAR Inventarios por Centro
export const borrarInventariosPorCentro = async (centroId) => {
    try {
        const response = await axios.delete(`${BASE_URL}/actas/inventarios/eliminar_por_centro/${centroId}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar inventarios del centro:", error);
        throw error;
    }
};

// ➤ OBTENER Ceses desde Actas
export const obtenerCesesActas = async (centroId) => {
    try {
        const response = await axios.get(`${BASE_URL}/actas/ceses`, {
            params: centroId ? { centro_id: centroId } : {},
        });
        return response.data;
    } catch (error) {
        console.error("Error al obtener ceses:", error);
        throw new Error("No se pudieron cargar los ceses.");
    }
};

// ➤ CREAR Cese desde Actas
export const registrarCeseActas = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/actas/ceses`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al crear cese:", error);
        throw error;
    }
};
// ➤ EDITAR Cese desde Actas
export const modificarCeseActas = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/actas/ceses/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al actualizar cese:", error);
        throw error;
    }
};

// ➤ ELIMINAR Cese desde Actas
export const borrarCeseActas = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/actas/ceses/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar cese:", error);
        throw error;
    }
};

// ➤ ELIMINAR Todos los Ceses por Centro
export const borrarCesesPorCentro = async (centroId) => {
    try {
        const response = await axios.delete(`${BASE_URL}/actas/ceses/eliminar_por_centro/${centroId}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar ceses del centro:", error);
        throw error;
    }
};

// ➤ OBTENER Retiros desde Actas
export const obtenerRetirosActas = async (centroId) => {
    try {
        const response = await axios.get(`${BASE_URL}/actas/retiros`, {
            params: centroId ? { centro_id: centroId } : {},
        });
        return response.data;
    } catch (error) {
        console.error("Error al obtener retiros:", error);
        throw new Error("No se pudieron cargar los retiros.");
    }
};

// ➤ CREAR Retiro desde Actas
export const registrarRetiroActas = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/actas/retiros`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al crear retiro:", error);
        throw error;
    }
};

// ➤ EDITAR Retiro desde Actas
export const modificarRetiroActas = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/actas/retiros/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al actualizar retiro:", error);
        throw error;
    }
};


// ➤ ELIMINAR Todos los Retiros por Centro
export const borrarRetirosPorCentro = async (centroId) => {
    try {
        const response = await axios.delete(`${BASE_URL}/actas/retiros/eliminar_por_centro/${centroId}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar retiros del centro:", error);
        throw error;
    }
};

// ➤ OBTENER Traslados desde Actas
export const obtenerTrasladosActas = async (centroId) => {
    try {
        const response = await axios.get(`${BASE_URL}/actas/traslados`, {
            params: centroId ? { centro_id: centroId } : {},
        });
        return response.data;
    } catch (error) {
        console.error("Error al obtener traslados:", error);
        throw new Error("No se pudieron cargar los traslados.");
    }
};

// ➤ CREAR Traslado desde Actas
export const registrarTrasladoActas = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/actas/traslados`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al crear traslado:", error);
        throw error;
    }
};

// ➤ EDITAR Traslado desde Actas
export const modificarTrasladoActas = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/actas/traslados/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al actualizar traslado:", error);
        throw error;
    }
};

// ➤ ELIMINAR Todos los Traslados por Centro
export const borrarTrasladosPorCentro = async (centroId) => {
    try {
        const response = await axios.delete(`${BASE_URL}/actas/traslados/eliminar_por_centro/${centroId}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar traslados del centro:", error);
        throw error;
    }
};

// ➤ OBTENER Instalaciones desde Actas
export const obtenerInstalacionesActas = async (centroId) => {
    try {
        const response = await axios.get(`${BASE_URL}/actas/instalaciones`, {
            params: centroId ? { centro_id: centroId } : {},
        });
        return response.data;
    } catch (error) {
        console.error("Error al obtener instalaciones:", error);
        throw new Error("No se pudieron cargar las instalaciones.");
    }
};

// ➤ CREAR Instalación desde Actas
export const registrarInstalacionActas = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/actas/instalaciones`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al crear instalación:", error);
        throw error;
    }
};

// ➤ EDITAR Instalación desde Actas
export const modificarInstalacionActas = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/actas/instalaciones/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al actualizar instalación:", error);
        throw error;
    }
};

// ➤ ELIMINAR Todas las Instalaciones por Centro
export const borrarInstalacionesPorCentro = async (centroId) => {
    try {
        const response = await axios.delete(`${BASE_URL}/actas/instalaciones/eliminar_por_centro/${centroId}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar instalaciones del centro:", error);
        throw error;
    }
};

// ➤ OBTENER Mantenciones desde Actas
export const obtenerMantencionesActas = async (centroId) => {
    try {
        const response = await axios.get(`${BASE_URL}/actas/mantenciones`, {
            params: centroId ? { centro_id: centroId } : {},
        });
        return response.data;
    } catch (error) {
        console.error("Error al obtener mantenciones:", error);
        throw new Error("No se pudieron cargar las mantenciones.");
    }
};

// ➤ CREAR Mantención desde Actas
export const registrarMantencionActas = async (formData) => {
    try {
        const response = await axios.post(`${BASE_URL}/actas/mantenciones`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al crear mantención:", error);
        throw error;
    }
};

// ➤ EDITAR Mantención desde Actas
export const modificarMantencionActas = async (id, formData) => {
    try {
        const response = await axios.put(`${BASE_URL}/actas/mantenciones/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error al actualizar mantención:", error);
        throw error;
    }
};

// ➤ ELIMINAR Todas las Mantenciones por Centro
export const borrarMantencionesPorCentro = async (centroId) => {
    try {
        const response = await axios.delete(`${BASE_URL}/actas/mantenciones/eliminar_por_centro/${centroId}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar mantenciones del centro:", error);
        throw error;
    }
};

// ➤ ELIMINAR Mantención por ID
export const borrarMantencionPorId = async (idMantencion) => {
    try {
        const response = await axios.delete(`${BASE_URL}/actas/mantenciones/${idMantencion}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar la mantención:", error);
        throw error;
    }
};

// ➤ DESCARGAR DOCUMENTO DE MANTENCIÓN
// Descargar documento asociado a la mantención y abrirlo en una nueva pestaña
export const descargarDocumentoMantencionActas = async (id) => {
    try {
        const response = await axios.get(`${BASE_URL}/actas/mantenciones/${id}/documento`, {
            responseType: 'blob',
        });

        const file = new Blob([response.data], { type: response.headers['content-type'] });
        const fileURL = window.URL.createObjectURL(file);
        
        // Abrir en una nueva pestaña
        window.open(fileURL, '_blank');
    } catch (error) {
        console.error("Error al visualizar el documento de la mantención:", error);
        alert("No se pudo visualizar el documento de la mantención.");
    }
};


// Crear soporte
export const crearSoporte = async (soporteData) => {
    try {
        const response = await axios.post(`${BASE_URL}/soporte/`, soporteData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Obtener soportes
export const obtenerSoportes = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/soporte/`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Actualizar soporte
export const actualizarSoporte = async (id, soporteData) => {
    try {
        const response = await axios.put(`${BASE_URL}/soporte/${id}`, soporteData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Eliminar soporte
export const eliminarSoporte = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/soporte/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Bodega: inventario de equipos (JSON)
export const obtenerInventarioBodegaEquipos = async (params = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/inventarios/bodega_equipos`, { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const crearInventarioBodegaEquipos = async (payload) => {
    try {
        const response = await axios.post(`${BASE_URL}/inventarios/bodega_equipos`, payload);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const actualizarInventarioBodegaEquipo = async (id, payload) => {
    try {
        const response = await axios.put(`${BASE_URL}/inventarios/bodega_equipos/${id}`, payload);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const eliminarInventarioBodegaEquipo = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/inventarios/bodega_equipos/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const obtenerCasosIsmael = async (params = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/soporte/ismael`, { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const obtenerBloqueosTecnicos = async (params = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/tecnico_bloqueos/`, { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const crearBloqueoTecnico = async (payload) => {
    try {
        const response = await axios.post(`${BASE_URL}/tecnico_bloqueos/`, payload);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const actualizarBloqueoTecnico = async (id, payload) => {
    try {
        const response = await axios.put(`${BASE_URL}/tecnico_bloqueos/${id}`, payload);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const eliminarBloqueoTecnico = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/tecnico_bloqueos/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// ===================== ACTAS ENTREGA =====================
export const obtenerActasEntrega = async (params = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/actas_entrega/`, { params });
        return response.data;
    } catch (error) {
        console.error("Error al obtener actas de entrega:", error);
        throw error;
    }
};

export const crearActaEntrega = async (payload) => {
    try {
        const response = await axios.post(`${BASE_URL}/actas_entrega/`, payload);
        return response.data;
    } catch (error) {
        console.error("Error al crear acta de entrega:", error);
        throw error;
    }
};

export const actualizarActaEntrega = async (idActaEntrega, payload) => {
    try {
        const response = await axios.put(`${BASE_URL}/actas_entrega/${idActaEntrega}`, payload);
        return response.data;
    } catch (error) {
        console.error("Error al actualizar acta de entrega:", error);
        throw error;
    }
};

export const eliminarActaEntrega = async (idActaEntrega) => {
    try {
        const response = await axios.delete(`${BASE_URL}/actas_entrega/${idActaEntrega}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar acta de entrega:", error);
        throw error;
    }
};

// === Armados técnicos ===
export const obtenerMantencionPreventiva = async ({ anio, mes, centros = [] }) => {
    try {
        const params = {
            anio,
            mes,
            centros: Array.isArray(centros) && centros.length ? centros.join(",") : undefined
        };
        const response = await axios.get(`${BASE_URL}/mantencion_preventiva/`, { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const guardarMantencionPreventivaBulk = async ({ anio, mes, revisiones }) => {
    try {
        const response = await axios.post(`${BASE_URL}/mantencion_preventiva/bulk`, {
            anio,
            mes,
            revisiones
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const obtenerArmados = async (params = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/armados`, { params });
        return response.data;
    } catch (error) {
        console.error("Error al obtener armados:", error);
        throw error;
    }
};

export const crearArmado = async (armadoData) => {
    try {
        const response = await axios.post(`${BASE_URL}/armados/`, armadoData);
        return response.data;
    } catch (error) {
        console.error("Error al crear armado:", error);
        throw error;
    }
};

export const actualizarArmado = async (id, armadoData) => {
    try {
        const response = await axios.put(`${BASE_URL}/armados/${id}`, armadoData);
        return response.data;
    } catch (error) {
        console.error("Error al actualizar armado:", error);
        throw error;
    }
};

export const eliminarArmado = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/armados/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar armado:", error);
        throw error;
    }
};

export const obtenerParticipacionesArmado = async (armadoId) => {
    try {
        const response = await axios.get(`${BASE_URL}/armados/${armadoId}/participaciones`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener participaciones:", error);
        throw error;
    }
};

export const obtenerMaterialesArmado = async (armadoId) => {
    try {
        const response = await axios.get(`${BASE_URL}/armados/${armadoId}/materiales`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener materiales:", error);
        throw error;
    }
};

export const guardarMaterialesArmado = async (armadoId, materiales) => {
    try {
        const response = await axios.put(`${BASE_URL}/armados/${armadoId}/materiales`, materiales);
        return response.data;
    } catch (error) {
        console.error("Error al guardar materiales:", error);
        throw error;
    }
};

export const obtenerMovimientosArmado = async (armadoId) => {
    try {
        const response = await axios.get(`${BASE_URL}/armados/${armadoId}/movimientos`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener movimientos:", error);
        throw error;
    }
};

export const obtenerHistorialEquiposArmado = async (armadoId) => {
    try {
        const response = await axios.get(`${BASE_URL}/armados/${armadoId}/historial-equipos`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener historial de equipos:", error);
        throw error;
    }
};

export const obtenerMovimientosRecientes = async (limit = 20, page = 1, filtros = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/armados/movimientos`, { params: { limit, page, ...filtros } });
        return response.data;
    } catch (error) {
        console.error("Error al obtener movimientos recientes:", error);
        throw error;
    }
};

export const eliminarMovimientoGlobal = async (movimientoId) => {
    try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const config = token
            ? { headers: { Authorization: `Bearer ${token}` } }
            : undefined;
        const response = await axios.delete(`${BASE_URL}/armados/movimientos/${movimientoId}`, config);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar movimiento global:", error);
        throw error;
    }
};

export const crearParticipacionArmado = async (armadoId, data) => {
    try {
        const response = await axios.post(`${BASE_URL}/armados/${armadoId}/participaciones`, data);
        return response.data;
    } catch (error) {
        console.error("Error al crear participación:", error);
        throw error;
    }
};

export const actualizarParticipacionArmado = async (participacionId, data) => {
    try {
        const response = await axios.put(`${BASE_URL}/armados/participaciones/${participacionId}`, data);
        return response.data;
    } catch (error) {
        console.error("Error al actualizar participación:", error);
        throw error;
    }
};

export const eliminarParticipacionArmado = async (participacionId, options = {}) => {
    try {
        const params = {};
        if (options.force) params.force = 1;
        const response = await axios.delete(
            `${BASE_URL}/armados/participaciones/${participacionId}`,
            { params }
        );
        return response.data;
    } catch (error) {
        console.error("Error al eliminar participación:", error);
        throw error;
    }
};



// Obtener todos los clientes
export const fetchClientes = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/consultas_centro/clientes`);
        return response.data;
    } catch (error) {
        console.error('Error fetching clients:', error);
        throw error;
    }
};

// Obtener centros asociados a un cliente
export const fetchCentrosPorCliente = async (clienteId) => {
    try {
        const response = await axios.get(`${BASE_URL}/consultas_centro/centros/${clienteId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching centers for client:', error);
        throw error;
    }
};

// Obtener historial y detalles de un centro
export const fetchHistorialCentro = async (centroId) => {
    try {
        const response = await axios.get(`${BASE_URL}/consultas_centro/centro_historial/${centroId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching center history:', error);
        throw error;
    }
};

// Descargar historial del centro en PDF
export const descargarHistorialCentroPDF = async (centroId) => {
    try {
        const response = await axios.get(`${BASE_URL}/consultas_centro/centro_historial/${centroId}/pdf`, {
            responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Historial_Centro_${centroId}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error descargando historial del centro en PDF:', error);
    }
};

// ===================== PERMISOS DE TRABAJO =====================
export const obtenerPermisosTrabajo = async (params = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/permisos_trabajo/`, { params });
        return response.data;
    } catch (error) {
        console.error("Error al obtener permisos de trabajo:", error);
        throw error;
    }
};

export const crearPermisoTrabajo = async (payload) => {
    try {
        const response = await axios.post(`${BASE_URL}/permisos_trabajo/`, payload);
        return response.data;
    } catch (error) {
        console.error("Error al crear permiso de trabajo:", error);
        throw error;
    }
};

export const actualizarPermisoTrabajo = async (idPermisoTrabajo, payload) => {
    try {
        const response = await axios.put(`${BASE_URL}/permisos_trabajo/${idPermisoTrabajo}`, payload);
        return response.data;
    } catch (error) {
        console.error("Error al actualizar permiso de trabajo:", error);
        throw error;
    }
};

export const eliminarPermisoTrabajo = async (idPermisoTrabajo) => {
    try {
        const response = await axios.delete(`${BASE_URL}/permisos_trabajo/${idPermisoTrabajo}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar permiso de trabajo:", error);
        throw error;
    }
};

// ===================== MANTENCIONES TERRENO =====================
export const obtenerMantencionesTerreno = async (params = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/mantenciones_terreno/`, { params });
        return response.data;
    } catch (error) {
        console.error("Error al obtener mantenciones en terreno:", error);
        throw error;
    }
};

export const eliminarMantencionTerreno = async (idMantencionTerreno) => {
    try {
        const response = await axios.delete(`${BASE_URL}/mantenciones_terreno/${idMantencionTerreno}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar mantencion en terreno:", error);
        throw error;
    }
};

export const obtenerCambiosEquipoMantencion = async (idMantencionTerreno) => {
    try {
        const response = await axios.get(`${BASE_URL}/mantenciones_terreno/${idMantencionTerreno}/cambios_equipo`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener cambios de equipo de mantencion:", error);
        throw error;
    }
};

// ===================== RETIROS TERRENO =====================
export const obtenerRetirosTerreno = async (params = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/retiros_terreno/`, { params });
        return response.data;
    } catch (error) {
        console.error("Error al obtener retiros en terreno:", error);
        throw error;
    }
};

export const recepcionarRetiroEnBodega = async (idRetiroTerreno, payload = {}) => {
    try {
        const response = await axios.post(`${BASE_URL}/retiros_terreno/${idRetiroTerreno}/recepcionar_bodega`, payload);
        return response.data;
    } catch (error) {
        console.error("Error al recepcionar retiro en bodega:", error);
        throw error;
    }
};

export const eliminarRetiroTerreno = async (idRetiroTerreno) => {
    try {
        const response = await axios.delete(`${BASE_URL}/retiros_terreno/${idRetiroTerreno}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar retiro en terreno:", error);
        throw error;
    }
};

// ===================== REVISION DE EQUIPOS =====================
export const obtenerOrdenesRevisionEquipos = async (params = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/revision_equipos/ordenes`, { params });
        return response.data;
    } catch (error) {
        console.error("Error al obtener ordenes de revision de equipos:", error);
        throw error;
    }
};

export const obtenerOrdenRevisionEquipos = async (idOrden) => {
    try {
        const response = await axios.get(`${BASE_URL}/revision_equipos/ordenes/${idOrden}`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener orden de revision:", error);
        throw error;
    }
};

export const crearOrdenRevisionEquipos = async (payload = {}) => {
    try {
        const response = await axios.post(`${BASE_URL}/revision_equipos/ordenes`, payload);
        return response.data;
    } catch (error) {
        console.error("Error al crear orden de revision:", error);
        throw error;
    }
};

export const actualizarOrdenRevisionEquipos = async (idOrden, payload = {}) => {
    try {
        const response = await axios.put(`${BASE_URL}/revision_equipos/ordenes/${idOrden}`, payload);
        return response.data;
    } catch (error) {
        console.error("Error al actualizar orden de revision:", error);
        throw error;
    }
};

export const devolverOperativosRevisionABodega = async (idOrden, payload = {}) => {
    try {
        const response = await axios.post(`${BASE_URL}/revision_equipos/ordenes/${idOrden}/devolver_operativos_bodega`, payload);
        return response.data;
    } catch (error) {
        console.error("Error al devolver operativos de revision a bodega:", error);
        throw error;
    }
};

export const eliminarOrdenRevisionEquipos = async (idOrden) => {
    try {
        const response = await axios.delete(`${BASE_URL}/revision_equipos/ordenes/${idOrden}`);
        return response.data;
    } catch (error) {
        console.error("Error al eliminar orden de revision:", error);
        throw error;
    }
};

// ===================== RENDICIONES =====================
export const obtenerRendiciones = async (params = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/rendiciones/`, { params });
        return response.data;
    } catch (error) {
        console.error("Error al obtener rendiciones:", error);
        throw error;
    }
};

export const crearRendicion = async (payload = {}) => {
    try {
        const response = await axios.post(`${BASE_URL}/rendiciones/`, payload);
        return response.data;
    } catch (error) {
        console.error("Error al crear rendicion:", error);
        throw error;
    }
};

export const actualizarRendicion = async (idRendicion, payload = {}) => {
    try {
        const response = await axios.put(`${BASE_URL}/rendiciones/${idRendicion}`, payload);
        return response.data;
    } catch (error) {
        console.error("Error al actualizar rendicion:", error);
        throw error;
    }
};

export const enviarRendicion = async (idRendicion) => {
    try {
        const response = await axios.post(`${BASE_URL}/rendiciones/${idRendicion}/enviar`);
        return response.data;
    } catch (error) {
        console.error("Error al enviar rendicion:", error);
        throw error;
    }
};

export const obtenerAbonosRendicion = async (params = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/rendiciones/abonos`, { params });
        return response.data;
    } catch (error) {
        console.error("Error al obtener abonos de rendicion:", error);
        throw error;
    }
};

export const crearAbonoRendicion = async (payload = {}) => {
    try {
        const response = await axios.post(`${BASE_URL}/rendiciones/abonos`, payload);
        return response.data;
    } catch (error) {
        console.error("Error al crear abono de rendicion:", error);
        throw error;
    }
};

export const obtenerSaldosRendicion = async (params = {}) => {
    try {
        const response = await axios.get(`${BASE_URL}/rendiciones/saldos`, { params });
        return response.data;
    } catch (error) {
        console.error("Error al obtener saldos de rendicion:", error);
        throw error;
    }
};
