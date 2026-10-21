import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ConsultaCentro from './ConsultaCentro';
import { obtenerClientes, obtenerCentrosPorCliente, obtenerHistorialCentro } from '../controllers/consultaCentroControllers';
import { obtenerActasEntrega, obtenerPermisosTrabajo } from '../api';

jest.mock('../controllers/consultaCentroControllers', () => ({
  obtenerClientes: jest.fn(), obtenerCentrosPorCliente: jest.fn(), obtenerHistorialCentro: jest.fn(), obtenerHistorialCentroPDF: jest.fn(),
}));
jest.mock('../api', () => ({ obtenerActasEntrega: jest.fn(), obtenerPermisosTrabajo: jest.fn() }));

const acta = { id_acta_entrega: 22, centro_id: 21, fecha_registro: '2026-09-13', tipo_instalacion: 'instalacion',
  tecnico_1: 'Gustavo Mella', tecnico_2: 'Renato Vega', recepciona_nombre: 'Receptor centro', armado_id: 21 };
const permiso = { id_permiso_trabajo: 8, centro_id: 21, acta_entrega_id: 22, fecha_ingreso: '2026-09-10', fecha_salida: '2026-09-13',
  tecnico_1: 'Gustavo Mella', tecnico_2: 'Renato Vega', descripcion_trabajo: 'Sistema instalado y probado.' };
const historial = (id) => ({ centro: { id_centro: Number(id), nombre: Number(id) === 21 ? 'Isla Colorada' : 'Aldachildo', estado: 'Activo' },
  historial: { instalaciones: [] }, equipos_ip: [], inventario: [] });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  obtenerClientes.mockImplementation((ok) => ok([{ id_cliente: 1, nombre: 'Aquachile' }, { id_cliente: 2, nombre: 'Otro cliente' }]));
  obtenerCentrosPorCliente.mockImplementation((id, ok) => ok([
    { id_centro: 21, nombre: 'Isla Colorada' }, { id_centro: 24, nombre: 'Aldachildo' },
  ]));
  obtenerHistorialCentro.mockImplementation((id, ok) => ok(historial(id)));
  obtenerActasEntrega.mockResolvedValue([acta]);
  obtenerPermisosTrabajo.mockResolvedValue([permiso]);
});

const seleccionarCentro = (centro = '21') => {
  fireEvent.change(screen.getByLabelText('Seleccionar cliente'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Seleccionar centro'), { target: { value: centro } });
};

test('does not request system documents before selecting a center', () => {
  render(<ConsultaCentro />);
  expect(obtenerActasEntrega).not.toHaveBeenCalled();
  expect(obtenerPermisosTrabajo).not.toHaveBeenCalled();
});

test('installation includes existing system acta and permiso with their actual dates and technicians', async () => {
  render(<ConsultaCentro />);
  seleccionarCentro();
  const actas = await screen.findByRole('region', { name: 'Actas sistema' });
  await waitFor(() => expect(within(actas).getByText('Acta #22')).toBeInTheDocument());
  const permisos = screen.getByRole('region', { name: 'Permisos sistema' });
  expect(obtenerActasEntrega).toHaveBeenCalledWith({ centro_id: '21' });
  expect(obtenerPermisosTrabajo).toHaveBeenCalledWith({ centro_id: '21' });
  expect(within(actas).getByText(/13.*09.*2026/)).toBeInTheDocument();
  expect(within(actas).getByText('Gustavo Mella / Renato Vega')).toBeInTheDocument();
  expect(within(permisos).getByText('Permiso #8')).toBeInTheDocument();
  expect(within(permisos).getByText(/13.*09.*2026/)).toBeInTheDocument();
  expect(within(permisos).getByText('Sistema instalado y probado.')).toBeInTheDocument();
  expect(screen.getByText('2 eventos')).toBeInTheDocument();
  expect(within(actas).queryByRole('button')).not.toBeInTheDocument();
});

test('manual installations and original documents remain available', async () => {
  obtenerHistorialCentro.mockImplementation((id, ok) => ok({ ...historial(id), historial: { instalaciones: [
    { id_instalacion: 7, fecha_instalacion: '2026-08-01', documento: '/documentos/instalacion.pdf', observacion: 'Instalacion manual existente' },
  ] } }));
  render(<ConsultaCentro />);
  seleccionarCentro();
  await screen.findByText('Acta #22');
  expect(screen.getByText('Instalaciones manuales')).toBeInTheDocument();
  expect(screen.getByText(/Instalacion manual existente/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ver documento' })).toHaveAttribute('href', '/documentos/instalacion.pdf');
  expect(screen.getByText('3 eventos')).toBeInTheDocument();
});

test('ignores responses from a previous center even when they arrive last', async () => {
  let resolverAnterior;
  obtenerActasEntrega.mockImplementation(({ centro_id }) => centro_id === '21'
    ? new Promise((resolve) => { resolverAnterior = resolve; })
    : Promise.resolve([{ ...acta, id_acta_entrega: 23, centro_id: 24 }]));
  obtenerPermisosTrabajo.mockResolvedValue([]);
  render(<ConsultaCentro />);
  seleccionarCentro();
  fireEvent.change(screen.getByLabelText('Seleccionar centro'), { target: { value: '24' } });
  await screen.findByText('Acta #23');
  await act(async () => { resolverAnterior([acta]); });
  expect(screen.queryByText('Acta #22')).not.toBeInTheDocument();
  expect(screen.getByText('Acta #23')).toBeInTheDocument();
});

test('old history cannot replace the newly selected center', async () => {
  let historialAnterior;
  obtenerHistorialCentro.mockImplementation((id, ok) => {
    if (id === '21') historialAnterior = ok;
    else ok(historial(id));
  });
  obtenerActasEntrega.mockResolvedValue([]);
  obtenerPermisosTrabajo.mockResolvedValue([]);
  render(<ConsultaCentro />);
  seleccionarCentro();
  fireEvent.change(screen.getByLabelText('Seleccionar centro'), { target: { value: '24' } });
  await act(async () => { historialAnterior(historial('21')); });
  expect(screen.getByRole('heading', { name: 'Aldachildo' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Isla Colorada' })).not.toBeInTheDocument();
});

test('does not display records belonging to other centers', async () => {
  obtenerActasEntrega.mockResolvedValue([acta, { ...acta, id_acta_entrega: 99, centro_id: 24 }]);
  obtenerPermisosTrabajo.mockResolvedValue([permiso, { ...permiso, id_permiso_trabajo: 99, centro_id: 24 }]);
  render(<ConsultaCentro />);
  seleccionarCentro();
  await screen.findByText('Acta #22');
  expect(screen.queryByText('Acta #99')).not.toBeInTheDocument();
  expect(screen.queryByText('Permiso #99')).not.toBeInTheDocument();
  expect(screen.getByText('2 eventos')).toBeInTheDocument();
});

test('partial loading error preserves successful documents and can be retried', async () => {
  obtenerActasEntrega.mockRejectedValueOnce(new Error('Error de red'));
  render(<ConsultaCentro />);
  seleccionarCentro();
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las actas del sistema.');
  expect(screen.getByText('Permiso #8')).toBeInTheDocument();
  expect(screen.queryByText('Sin actas del sistema registradas.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar documentos' }));
  await screen.findByText('Acta #22');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('switching clients clears documents from the previous selection', async () => {
  render(<ConsultaCentro />);
  seleccionarCentro();
  await screen.findByText('Acta #22');
  fireEvent.change(screen.getByLabelText('Seleccionar cliente'), { target: { value: '2' } });
  expect(screen.queryByText('Acta #22')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Permisos sistema' })).not.toBeInTheDocument();
});

test('empty responses and invalid dates do not break the center history', async () => {
  obtenerActasEntrega.mockResolvedValue([{ ...acta, fecha_registro: 'invalid' }]);
  obtenerPermisosTrabajo.mockResolvedValue(null);
  render(<ConsultaCentro />);
  seleccionarCentro();
  await screen.findByText('Acta #22');
  expect(screen.getByText('Sin fecha registrada')).toBeInTheDocument();
  expect(screen.getByText('Sin permisos del sistema registrados.')).toBeInTheDocument();
});

test('center without system documents displays both empty groups', async () => {
  obtenerActasEntrega.mockResolvedValue([null]);
  obtenerPermisosTrabajo.mockResolvedValue([]);
  render(<ConsultaCentro />);
  seleccionarCentro();
  expect(await screen.findByText('Sin actas del sistema registradas.')).toBeInTheDocument();
  expect(screen.getByText('Sin permisos del sistema registrados.')).toBeInTheDocument();
  expect(screen.getByText('0 eventos')).toBeInTheDocument();
});

test('system documents are ordered by their actual dates, newest first', async () => {
  obtenerActasEntrega.mockResolvedValue([{ ...acta, id_acta_entrega: 20, fecha_registro: '2026-08-01' }, acta]);
  render(<ConsultaCentro />);
  seleccionarCentro();
  await screen.findByText('Acta #22');
  const items = within(screen.getByRole('region', { name: 'Actas sistema' })).getAllByRole('listitem');
  expect(items[0]).toHaveTextContent('Acta #22');
  expect(items[1]).toHaveTextContent('Acta #20');
});
