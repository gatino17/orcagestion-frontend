import { crearActividad, obtenerActividades, actualizarActividad, eliminarActividad } from '../api';

// Función para crear actividad
export const agregarActividad = async (actividadData) => {
  try {
    const data = await crearActividad(actividadData);
    console.log('Actividad creada:', data);
    return data;
  } catch (error) {
    console.error('Error en agregarActividad:', error);
    throw error;
  }
};

// Función para obtener todas las actividades
export const cargarActividades = async () => {
  try {
    const actividades = await obtenerActividades();
    console.log('Actividades cargadas:', actividades);
    return actividades;
  } catch (error) {
    console.error('Error en cargarActividades:', error);
    throw error;
  }
};

// Función para actualizar actividad
export const modificarActividad = async (idActividad, actividadData) => {
  try {
    const data = await actualizarActividad(idActividad, actividadData);
    console.log('Actividad actualizada:', data);
    return data;
  } catch (error) {
    console.error('Error en modificarActividad:', error);
    throw error;
  }
};

// Función para eliminar actividad
export const borrarActividad = async (idActividad) => {
  try {
    const data = await eliminarActividad(idActividad);
    console.log('Actividad eliminada:', data);
    return data;
  } catch (error) {
    console.error('Error en borrarActividad:', error);
    throw error;
  }
};
