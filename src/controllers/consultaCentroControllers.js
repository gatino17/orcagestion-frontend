// consultaCentroControllers.js

import { fetchClientes, fetchCentrosPorCliente, fetchHistorialCentro, descargarHistorialCentroPDF  } from '../api';



export const obtenerClientes = async (setClientes, setError) => {
    try {
        const clientes = await fetchClientes();
        setClientes(clientes);
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        setError('No se pudo cargar la lista de clientes.');
    }
};

export const obtenerCentrosPorCliente = async (clienteId, setCentros, setError) => {
    try {
        const centros = await fetchCentrosPorCliente(clienteId);
        console.log("Centros cargados desde el backend:", centros); // Log para verificar datos
        setCentros(centros);
    } catch (error) {
        console.error('Error al obtener centros:', error);
        setError('No se pudieron cargar los centros asociados al cliente.');
    }
};


export const obtenerHistorialCentro = async (centroId, setHistorial, setError) => {
    try {
        const historial = await fetchHistorialCentro(centroId);
        setHistorial(historial);
    } catch (error) {
        console.error('Error al obtener historial del centro:', error);
        setError('No se pudo cargar el historial del centro.');
    }
};

export const obtenerHistorialCentroPDF = async (centroId) => {
    try {
        await descargarHistorialCentroPDF(centroId);
    } catch (error) {
        console.error('Error al descargar el historial en PDF:', error);
    }
};