import axios from 'axios';
import { API_BASE_URL, obtenerInstalacionesActas, registrarInstalacionActas } from './api';
import { resolverDocumentoInstalacion, urlDocumentoInstalacion } from './utils/documentosInstalacion';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

test('consulta la ruta real de instalaciones filtrando por centro', async () => {
  axios.get.mockResolvedValue({ data: [{ id_instalacion: 7, centro_id: 21 }] });
  expect(await obtenerInstalacionesActas(21)).toEqual([{ id_instalacion: 7, centro_id: 21 }]);
  expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/instalaciones/`, { params: { centro_id: 21 } });
});

test('envia el adjunto manual sin convertir el formulario a JSON', async () => {
  axios.post.mockResolvedValue({ data: { id_instalacion: 7 } });
  const data = new FormData();
  data.append('centro_id', 21);
  data.append('documento_acta', new File(['pdf'], 'acta.pdf'));
  expect(await registrarInstalacionActas(data)).toEqual({ id_instalacion: 7 });
  expect(axios.post).toHaveBeenCalledWith(`${API_BASE_URL}/actas/instalaciones`, data,
    { headers: { 'Content-Type': 'multipart/form-data' } });
});

test('resuelve documentos contra la API configurada y conserva adjuntos alternativos', () => {
  expect(urlDocumentoInstalacion(7)).toBe(`${API_BASE_URL}/filtro/documento/Instalaciones/7`);
  expect(resolverDocumentoInstalacion('http://localhost:5000/api/filtro/documento/Instalaciones/7', 7)).toBe(urlDocumentoInstalacion(7));
  expect(resolverDocumentoInstalacion('/api/filtro/documento/Instalaciones/7', 7)).toBe(urlDocumentoInstalacion(7));
  expect(resolverDocumentoInstalacion('/documentos/respaldo.pdf', 7)).toBe('/documentos/respaldo.pdf');
  expect(resolverDocumentoInstalacion(null, 7)).toBeNull();
});
