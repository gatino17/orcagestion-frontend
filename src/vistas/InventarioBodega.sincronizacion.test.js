import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InventarioBodega from './InventarioBodega';
import { obtenerInventarioBodegaTomas, obtenerInventarioBodegaToma, obtenerInventarioBodegaTipos } from '../api';

jest.mock('../api', () => ({
  obtenerInventarioBodegaTomas: jest.fn(), obtenerInventarioBodegaToma: jest.fn(), obtenerInventarioBodegaTipos: jest.fn(),
}));
const mockHandlers = {};
const mockSocket = { on: jest.fn((evento, handler) => { mockHandlers[evento] = handler; }), off: jest.fn(), disconnect: jest.fn() };
jest.mock('socket.io-client', () => ({ io: () => mockSocket }));

const equipo = { id_bodega_equipo: 1, codigo: '31142', numero_serie: '31142001', equipo_nombre: 'PC' };
const informe = (id = 1, faltantes = [equipo]) => ({ id_toma: id, nombre: `Informe ${id}`, estado: 'abierto',
  fecha_inicio: '2026-10-21T12:00:00Z', escaneos: [], resumen: { total_esperado: faltantes.length,
    encontrados: 0, faltantes: faltantes.length, total_escaneos: 0, cumplimiento: 0, faltantes_detalle: faltantes } });

beforeEach(() => {
  jest.clearAllMocks();
  mockSocket.on.mockImplementation((evento, handler) => { mockHandlers[evento] = handler; });
  Object.keys(mockHandlers).forEach((key) => delete mockHandlers[key]);
  localStorage.clear();
  obtenerInventarioBodegaTipos.mockResolvedValue([{ categoria: 'Oficina', equipo_nombre: 'PC', total_esperado: 1 }]);
  obtenerInventarioBodegaTomas.mockResolvedValue([informe()]);
  obtenerInventarioBodegaToma.mockResolvedValue(informe());
});

const eventoInventario = async () => { await act(async () => { mockHandlers.inventario_updated({ tipo: 'equipo_eliminado', id_bodega_equipo: 1 }); }); };

test('deleting equipment refreshes missing details and totals without reloading the page', async () => {
  render(<InventarioBodega />);
  await screen.findByText('31142001');
  obtenerInventarioBodegaTomas.mockResolvedValue([informe(1, [])]);
  obtenerInventarioBodegaToma.mockResolvedValue(informe(1, []));
  await eventoInventario();
  await waitFor(() => expect(screen.queryByText('31142001')).not.toBeInTheDocument());
  expect(screen.getByText('Faltantes (0)')).toBeInTheDocument();
});

test('returning to the window refreshes changes missed while in Bodega Retiros', async () => {
  render(<InventarioBodega />);
  await screen.findByText('31142001');
  obtenerInventarioBodegaTomas.mockResolvedValue([informe(1, [])]);
  obtenerInventarioBodegaToma.mockResolvedValue(informe(1, []));
  fireEvent(window, new Event('focus'));
  await waitFor(() => expect(screen.queryByText('31142001')).not.toBeInTheDocument());
});

test('reconnecting refreshes the report while preserving the selected equipment filter', async () => {
  render(<InventarioBodega />);
  await screen.findByText('31142001');
  const selector = screen.getAllByRole('combobox').find((select) =>
    Array.from(select.options).some((option) => option.value === 'PC'));
  fireEvent.change(selector, { target: { value: 'PC' } });
  await waitFor(() => expect(obtenerInventarioBodegaToma).toHaveBeenLastCalledWith(1, { tipo_equipo: 'PC' }));
  const llamadas = obtenerInventarioBodegaToma.mock.calls.length;
  await act(async () => { mockHandlers.connect(); });
  await waitFor(() => expect(obtenerInventarioBodegaToma.mock.calls.length).toBeGreaterThan(llamadas));
  expect(obtenerInventarioBodegaToma).toHaveBeenLastCalledWith(1, { tipo_equipo: 'PC' });
  expect(selector).toHaveValue('PC');
});

test('background refresh preserves the selected report', async () => {
  obtenerInventarioBodegaTomas.mockResolvedValue([informe(1, []), informe(2, [])]);
  obtenerInventarioBodegaToma.mockImplementation(async (id) => informe(id, []));
  render(<InventarioBodega />);
  const selector = await screen.findByRole('button', { name: /Informe 2/ });
  fireEvent.click(selector);
  await waitFor(() => expect(document.querySelector('.inventario-toma-row.active')).toHaveTextContent('Informe 2'));
  await eventoInventario();
  await waitFor(() => expect(obtenerInventarioBodegaTomas).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(obtenerInventarioBodegaToma).toHaveBeenLastCalledWith(2, {}));
  expect(document.querySelector('.inventario-toma-row.active')).toHaveTextContent('Informe 2');
});

test('older responses cannot restore missing equipment after a newer refresh', async () => {
  render(<InventarioBodega />);
  await screen.findByText('31142001');
  let resolverAnterior;
  obtenerInventarioBodegaToma.mockImplementationOnce(() => new Promise((resolve) => { resolverAnterior = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: /Actualizar/ }));
  await waitFor(() => expect(resolverAnterior).toBeDefined());
  obtenerInventarioBodegaTomas.mockResolvedValue([informe(1, [])]);
  obtenerInventarioBodegaToma.mockResolvedValue(informe(1, []));
  await eventoInventario();
  await waitFor(() => expect(screen.queryByText('31142001')).not.toBeInTheDocument());
  await act(async () => { resolverAnterior(informe()); });
  expect(screen.queryByText('31142001')).not.toBeInTheDocument();
});

test('unmount removes event listeners and closes its socket', async () => {
  const { unmount } = render(<InventarioBodega />);
  await screen.findByText('31142001');
  unmount();
  expect(mockSocket.off).toHaveBeenCalledWith('inventario_updated', expect.any(Function));
  expect(mockSocket.off).toHaveBeenCalledWith('connect', expect.any(Function));
  expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
});
