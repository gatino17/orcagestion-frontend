import axios from 'axios';
import { API_BASE_URL, obtenerArmados } from './api';

jest.mock('axios', () => ({ get: jest.fn() }));
afterEach(() => localStorage.removeItem('token'));

test('authenticated armado GET uses canonical URL without CORS preflight redirect', async () => {
  localStorage.setItem('token', 'test-session-token');
  const armados = [{ id_armado: 1, estado: 'prefinalizado' }];
  axios.get.mockResolvedValue({ data: armados });
  expect(await obtenerArmados({ centro_id: 5 })).toEqual(armados);
  expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/armados/`, {
    headers: { Authorization: 'Bearer test-session-token' }, params: { centro_id: 5 },
  });
});

test('GET without token retains parameters and does not send false authorization', async () => {
  axios.get.mockResolvedValue({ data: [] });
  await obtenerArmados();
  expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/armados/`, { params: {} });
});
