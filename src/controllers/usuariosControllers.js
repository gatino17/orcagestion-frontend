// src/controllers/usuariosControllers.js
import { obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario } from '../api';

export const cargarUsuarios = async (setUsuarios) => {
    try {
        const usuarios = await obtenerUsuarios();
        setUsuarios(usuarios);
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
    }
};

export const agregarUsuario = async (usuario, callback) => {
    try {
        await crearUsuario(usuario);
        callback(); // Llama a la función para actualizar la vista (por ejemplo, cargarUsuarios)
    } catch (error) {
        console.error('Error al agregar usuario:', error);
    }
};

// Y así para actualizar y eliminar usuarios
// Función para actualizar un usuario y recargar la lista
export const modificarUsuario = async (id, usuario, callback) => {
  try {
      await actualizarUsuario(id, usuario);
      callback(); // Llama a la función para recargar la lista de usuarios
  } catch (error) {
      console.error('Error al actualizar usuario:', error);
  }
};

// Función para eliminar un usuario y recargar la lista
export const borrarUsuario = async (id, callback) => {
  try {
      await eliminarUsuario(id);
      callback(); // Llama a la función para recargar la lista de usuarios
  } catch (error) {
      console.error('Error al eliminar usuario:', error);
  }
};