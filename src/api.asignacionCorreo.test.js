import axios from 'axios';
import { API_BASE_URL, crearActividad, actualizarActividad, crearArmado } from './api';

jest.mock('axios', () => ({ post: jest.fn(), put: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); localStorage.setItem('token', 'sesion-prueba'); });
afterEach(() => localStorage.clear());

test('crear y editar actividad y asignar armado envian la sesion para autorizar el correo', async () => {
  axios.post.mockResolvedValue({ data: { aviso_correo: { estado: 'enviado' } } });
  axios.put.mockResolvedValue({ data: { aviso_correo: { estado: 'enviado' } } });
  const payload = { notificar_por_correo: true };
  const config = { headers: { Authorization: 'Bearer sesion-prueba' } };
  expect(await crearActividad(payload)).toEqual({ aviso_correo: { estado: 'enviado' } });
  await actualizarActividad(4, payload);
  await crearArmado(payload);
  expect(axios.post).toHaveBeenCalledWith(`${API_BASE_URL}/actividades/`, payload, config);
  expect(axios.put).toHaveBeenCalledWith(`${API_BASE_URL}/actividades/4`, payload, config);
  expect(axios.post).toHaveBeenCalledWith(`${API_BASE_URL}/armados/`, payload, config);
});
