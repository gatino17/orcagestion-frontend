import axios from 'axios';
import { API_BASE_URL, obtenerIntervencionesMantencion, vincularDocumentoMantencion, desvincularDocumentoMantencion, registrarMantencionActas } from './api';
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), delete: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); localStorage.setItem('token', 'sesion-prueba'); });
afterEach(() => localStorage.clear());
test('consulta intervenciones del centro con autenticacion', async () => {
  axios.get.mockResolvedValue({ data: { items: [] } });
  expect(await obtenerIntervencionesMantencion(21)).toEqual({ items: [] });
  expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/intervenciones-mantencion/centros/21`, { headers: { Authorization: 'Bearer sesion-prueba' } });
});
test('vincula solo el documento y su tipo al soporte', async () => {
  axios.post.mockResolvedValue({ data: {} });
  await vincularDocumentoMantencion(8, { tipo: 'sistema', documento_id: 2 });
  expect(axios.post).toHaveBeenCalledWith(`${API_BASE_URL}/intervenciones-mantencion/soportes/8/documentos`, { tipo: 'sistema', documento_id: 2 }, { headers: { Authorization: 'Bearer sesion-prueba' } });
});
test('elimina la asociacion, no el documento', async () => {
  axios.delete.mockResolvedValue({ data: {} });
  await desvincularDocumentoMantencion(8, 9);
  expect(axios.delete).toHaveBeenCalledWith(`${API_BASE_URL}/intervenciones-mantencion/soportes/8/documentos/9`, { headers: { Authorization: 'Bearer sesion-prueba' } });
});

test('adjunta un nuevo archivo con el soporte y la sesion del usuario', async () => {
  axios.post.mockResolvedValue({ data: { id_mantencion: 10 } });
  const form = new FormData();
  form.append('soporte_id', '1239');
  expect(await registrarMantencionActas(form)).toEqual({ id_mantencion: 10 });
  expect(axios.post).toHaveBeenCalledWith(`${API_BASE_URL}/actas/mantenciones`, form,
    { headers: { Authorization: 'Bearer sesion-prueba', 'Content-Type': 'multipart/form-data' } });
});
