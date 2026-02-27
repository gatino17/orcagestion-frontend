import {
    obtenerArmados,
    crearArmado,
    actualizarArmado,
    eliminarArmado,
    obtenerParticipacionesArmado,
    crearParticipacionArmado,
    actualizarParticipacionArmado,
    eliminarParticipacionArmado,
    obtenerMaterialesArmado,
    guardarMaterialesArmado,
    obtenerMovimientosArmado,
    obtenerMovimientosRecientes
} from "../api";

export const cargarArmados = async (setArmados, params = {}) => {
    try {
        const data = await obtenerArmados(params);
        setArmados(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error("Error al cargar armados:", error);
    }
};

export const agregarArmado = async (armadoData, callback) => {
    try {
        await crearArmado(armadoData);
        callback?.();
    } catch (error) {
        console.error("Error al crear armado:", error);
    }
};

export const modificarArmado = async (id, armadoData, callback) => {
    try {
        await actualizarArmado(id, armadoData);
        callback?.();
    } catch (error) {
        console.error("Error al actualizar armado:", error);
    }
};

export const borrarArmado = async (id, callback) => {
    try {
        await eliminarArmado(id);
        callback?.();
    } catch (error) {
        console.error("Error al eliminar armado:", error);
    }
};

export const cargarParticipaciones = async (armadoId, setParticipaciones) => {
    try {
        const data = await obtenerParticipacionesArmado(armadoId);
        setParticipaciones(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error("Error al cargar participaciones:", error);
    }
};

export const transferirArmado = async (armadoId, payload, callback) => {
    try {
        await crearParticipacionArmado(armadoId, payload);
        callback?.();
    } catch (error) {
        console.error("Error al transferir armado:", error);
    }
};

export const actualizarParticipacion = async (participacionId, payload, callback) => {
    try {
        await actualizarParticipacionArmado(participacionId, payload);
        callback?.();
    } catch (error) {
        console.error("Error al actualizar participación:", error);
    }
};

export const borrarParticipacion = async (participacionId, callback) => {
    try {
        await eliminarParticipacionArmado(participacionId);
        callback?.();
    } catch (error) {
        console.error("Error al eliminar participación:", error);
        throw error;
    }
};

export const cargarMateriales = async (armadoId, setMateriales) => {
    try {
        const data = await obtenerMaterialesArmado(armadoId);
        setMateriales(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error("Error al cargar materiales:", error);
    }
};

export const guardarMateriales = async (armadoId, materiales, callback) => {
    try {
        await guardarMaterialesArmado(armadoId, materiales);
        callback?.();
    } catch (error) {
        console.error("Error al guardar materiales:", error);
    }
};

export const cargarMovimientos = async (armadoId, setMovimientos) => {
    try {
        const data = await obtenerMovimientosArmado(armadoId);
        setMovimientos(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error("Error al cargar movimientos:", error);
    }
};

export const cargarMovimientosRecientes = async (setMovimientos, limit = 20, page = 1, setMeta = null) => {
    try {
        const data = await obtenerMovimientosRecientes(limit, page);
        if (Array.isArray(data)) {
            // compat: si backend viejo devuelve lista
            setMovimientos(data);
            setMeta?.({ total: data.length, page, limit });
        } else {
            setMovimientos(Array.isArray(data.items) ? data.items : []);
            setMeta?.({ total: data.total || 0, page: data.page || page, limit: data.limit || limit });
        }
    } catch (error) {
        console.error("Error al cargar movimientos recientes:", error);
    }
};
