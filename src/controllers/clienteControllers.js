// src/controllers/clientesControllers.js
import { obtenerClientes, crearCliente, actualizarCliente, eliminarCliente } from '../api';

export const cargarClientes = async (setClientes) => {
    try {
        const clientes = await obtenerClientes();
        setClientes(clientes);
    } catch (error) {
        console.error('Error al cargar clientes:', error);
    }
};

export const agregarCliente = async (cliente, callback) => {
    try {
        await crearCliente(cliente);
        callback(); // Llama a la función para actualizar la vista (por ejemplo, cargarClientes)
    } catch (error) {
        console.error('Error al agregar cliente:', error);
    }
};

export const modificarCliente = async (id, cliente, callback) => {
    try {
        await actualizarCliente(id, cliente);
        callback(); // Llama a la función para recargar la lista de clientes
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
    }
};

export const borrarCliente = async (id, callback) => {
    try {
        await eliminarCliente(id);
        callback(); // Llama a la función para recargar la lista de clientes
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
    }
};
