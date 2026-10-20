import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Home from './Home';
import { obtenerArmados, obtenerCasosIsmael, obtenerGuiasSalidaArmado, obtenerSoportes, confirmarInstalacionArmado } from '../api';
import { cargarActividades } from '../controllers/actividadesControllers';
import { cargarEncargados } from '../controllers/encargadosControllers';
import { cargarCentrosClientes } from '../controllers/centrosControllers';
import { fechaHoyChile } from '../utils/seguimientoArmado';
import { MemoryRouter } from 'react-router-dom';
import PrivateRoute from '../components/PrivateRoute';

jest.mock('../api', () => ({ obtenerArmados: jest.fn(), obtenerCasosIsmael: jest.fn(),
  obtenerGuiasSalidaArmado: jest.fn(), obtenerSoportes: jest.fn(), confirmarInstalacionArmado: jest.fn() }));
jest.mock('../controllers/actividadesControllers', () => ({ cargarActividades: jest.fn(), modificarActividad: jest.fn(), agregarActividad: jest.fn() }));
jest.mock('../controllers/encargadosControllers', () => ({ cargarEncargados: jest.fn() }));
jest.mock('../controllers/centrosControllers', () => ({ cargarCentrosClientes: jest.fn() }));
jest.mock('@fullcalendar/react', () => () => null);
jest.mock('@fullcalendar/daygrid', () => ({}));
jest.mock('@fullcalendar/interaction', () => ({}));
jest.mock('@fullcalendar/timegrid', () => ({}));
jest.mock('@fullcalendar/core/locales/es', () => ({}));
jest.mock('react-data-table-component', () => () => null);
jest.mock('socket.io-client', () => ({ io: () => ({ on: jest.fn(), off: jest.fn(), disconnect: jest.fn() }) }));
jest.setTimeout(15000);

const armado = (id, cambios = {}) => ({ id_armado: id, centro: { nombre: `Centro ${id}`, cliente: 'Cliente A' },
  estado: 'finalizado', fecha_asignacion: '2026-10-01', fecha_cierre: '2026-10-10',
  tecnico: { nombre: 'Jorge' }, total_cajas: 2,
  seguimiento: { fecha_asignacion: '2026-10-01', fecha_inicio: '2026-10-02', fecha_fin_armado: '2026-10-10',
    despacho: { total_bultos: 2, bultos_enviados: 2, completo: true, fecha_completo: '2026-10-15' },
    puede_confirmar_instalacion: true, actas: [],
    asignacion_instalacion: { asignada: true, fecha_inicio: '2000-01-01', estado: 'En progreso', actividad_id: 7, instaladores: [{ nombre: 'Instalador de terreno' }] },
  }, ...cambios });

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
beforeEach(() => {
  jest.clearAllMocks();
  cargarCentrosClientes.mockResolvedValue([]);
  cargarEncargados.mockResolvedValue([]);
  cargarActividades.mockResolvedValue([]);
  obtenerCasosIsmael.mockResolvedValue([]);
  obtenerSoportes.mockResolvedValue([]);
  obtenerGuiasSalidaArmado.mockResolvedValue([]);
  obtenerArmados.mockResolvedValue([armado(1)]);
});
const tarjeta = () => screen.getByText('Trabajo en curso de hoy').closest('.home-work-card');

test('inventory with Home permission sees all timelines without permission to edit armados', async () => {
  const payload = { rol: 'inventario', paginas: ['inicio', 'inventario_bodega'] };
  localStorage.setItem('token', `e30.${btoa(JSON.stringify(payload))}.test`);
  const lista = [armado(1, { estado: 'prefinalizado', seguimiento: { ...armado(1).seguimiento, puede_confirmar_instalacion: false } }),
    armado(2, { seguimiento: { ...armado(2).seguimiento, puede_confirmar_instalacion: false } })];
  obtenerArmados.mockResolvedValue(lista);
  try {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PrivateRoute requiredPage="inicio" allowedRoles={['admin', 'tecnico', 'soporte', 'operaciones', 'finanzas']}>
        <Home />
      </PrivateRoute>
    </MemoryRouter>);
    await waitFor(() => expect(within(tarjeta()).getByText('Centro 1')).toBeInTheDocument());
    expect(within(tarjeta()).getByText('Centro 2')).toBeInTheDocument();
    expect(within(tarjeta()).getAllByRole('list', { name: 'Seguimiento del armado' })).toHaveLength(2);
    expect(within(tarjeta()).queryByRole('button', { name: 'Confirmar instalacion' })).not.toBeInTheDocument();
    expect(obtenerArmados).toHaveBeenCalledWith();
  } finally { localStorage.removeItem('token'); }
});

test('finished armado remains in work card until explicitly installed', async () => {
  const instalacion = { fecha_instalacion: fechaHoyChile(), confirmado_por_nombre: 'Jorge' };
  confirmarInstalacionArmado.mockResolvedValue({ instalacion });
  render(<Home />);
  await waitFor(() => expect(within(tarjeta()).getByText('Centro 1')).toBeInTheDocument());
  expect(within(tarjeta()).getAllByText('Instalacion asignada')).toHaveLength(1);
  fireEvent.click(within(tarjeta()).getByRole('button', { name: 'Confirmar instalacion' }));
  obtenerArmados.mockResolvedValue([{ ...armado(1), seguimiento: { ...armado(1).seguimiento, instalacion } }]);
  await act(async () => { fireEvent.submit(screen.getByRole('dialog').querySelector('form')); });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(within(tarjeta()).getByText('Centro 1')).toBeInTheDocument();
  expect(within(tarjeta()).getByText(/Instalacion confirmada por Jorge/)).toBeInTheDocument();
  expect(tarjeta().querySelector('.home-state-finalizado')).toHaveTextContent('Instalado');
});

test('old installed and cancelled stay excluded without history button', async () => {
  obtenerArmados.mockResolvedValue([armado(1), armado(2, { seguimiento: { instalacion: { fecha_instalacion: '2000-01-01' } } }),
    armado(3, { estado: 'cancelado' })]);
  render(<Home />);
  await waitFor(() => expect(within(tarjeta()).getByText('Centro 1')).toBeInTheDocument());
  expect(within(tarjeta()).queryByText('Centro 2')).not.toBeInTheDocument();
  expect(within(tarjeta()).queryByRole('button', { name: /Ver instalados|Ocultar anteriores/ })).not.toBeInTheDocument();
  expect(within(tarjeta()).queryByText('Centro 3')).not.toBeInTheDocument();
});

test('more than six jobs can all be reached through pagination', async () => {
  obtenerArmados.mockResolvedValue(Array.from({ length: 8 }, (_, i) => armado(i + 1)));
  render(<Home />);
  await waitFor(() => expect(within(tarjeta()).getByText('Pagina 1 de 2')).toBeInTheDocument());
  expect(tarjeta().querySelectorAll('.home-work-item')).toHaveLength(6);
  expect(tarjeta().querySelector('.home-work-count')).toHaveTextContent('8');
  fireEvent.click(within(tarjeta()).getByRole('button', { name: 'Siguiente' }));
  expect(tarjeta().querySelectorAll('.home-work-item')).toHaveLength(2);
  expect(within(tarjeta()).getByText('Centro 8')).toBeInTheDocument();
});

test('regular activities and Ismael cases remain alongside armados', async () => {
  cargarActividades.mockResolvedValue([{ id_actividad: 7, nombre_actividad: 'Visita', area: 'Instalacion',
    estado: 'En progreso', fecha_inicio: '2026-10-01', centro: { nombre: 'Actividad centro', cliente: 'Cliente A' } }]);
  obtenerCasosIsmael.mockResolvedValue([{ id: 3, centro_nombre: 'Correo centro', cliente_nombre: 'Cliente A',
    estado: 'nuevo', hora_llegada: new Date().toISOString(), falla_especifica: 'Sin enlace' }]);
  render(<Home />);
  await waitFor(() => expect(within(tarjeta()).getByText('Centro 1')).toBeInTheDocument());
  expect(within(tarjeta()).getByText('Actividad centro')).toBeInTheDocument();
  expect(within(tarjeta()).getByText('Entrada Ismael')).toBeInTheDocument();
  expect(within(tarjeta()).getAllByRole('list', { name: 'Seguimiento del armado' })).toHaveLength(1);
});

test('guide error does not discard valid armados', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    obtenerGuiasSalidaArmado.mockRejectedValue(new Error('Error de guias'));
    render(<Home />);
    await waitFor(() => expect(within(tarjeta()).getByText('Centro 1')).toBeInTheDocument());
    expect(within(tarjeta()).getByRole('list', { name: 'Seguimiento del armado' })).toBeInTheDocument();
    expect(within(tarjeta()).getByRole('alert')).toHaveTextContent('Esto no oculta los armados');
    expect(error).toHaveBeenCalled();
  } finally { error.mockRestore(); }
});

test('slow guides do not delay showing armados', async () => {
  let resolve;
  obtenerGuiasSalidaArmado.mockReturnValue(new Promise((done) => { resolve = done; }));
  render(<Home />);
  await waitFor(() => expect(within(tarjeta()).getByText('Centro 1')).toBeInTheDocument());
  expect(within(tarjeta()).queryByText('Cargando armados...')).not.toBeInTheDocument();
  await act(async () => { resolve([]); });
});

test('armado error is visible and retry restores the timeline', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    obtenerArmados.mockRejectedValueOnce(new Error('Error de red'));
    render(<Home />);
    await waitFor(() => expect(within(tarjeta()).getByRole('alert')).toHaveTextContent('No se pudieron actualizar los armados'));
    fireEvent.click(within(tarjeta()).getByRole('button', { name: 'Reintentar carga de armados' }));
    await waitFor(() => expect(within(tarjeta()).getByText('Centro 1')).toBeInTheDocument());
    expect(within(tarjeta()).queryByRole('alert')).not.toBeInTheDocument();
    expect(error).toHaveBeenCalled();
  } finally { error.mockRestore(); }
});

test('unassigned installation shows pending installers without confirmation action', async () => {
  obtenerArmados.mockResolvedValue([{ ...armado(1), seguimiento: { ...armado(1).seguimiento, asignacion_instalacion: null } }]);
  render(<Home />);
  await waitFor(() => expect(within(tarjeta()).getByText('Centro 1')).toBeInTheDocument());
  expect(within(tarjeta()).getAllByText('Pendiente de asignacion de instaladores')).toHaveLength(1);
  expect(within(tarjeta()).queryByRole('button', { name: 'Confirmar instalacion' })).not.toBeInTheDocument();
});

test('programmed installation status is shown only once', async () => {
  const item = armado(1);
  item.seguimiento.asignacion_instalacion.fecha_inicio = '2099-10-20';
  obtenerArmados.mockResolvedValue([item]);
  render(<Home />);
  await waitFor(() => expect(within(tarjeta()).getByText('Centro 1')).toBeInTheDocument());
  expect(within(tarjeta()).getAllByText('Instalacion programada')).toHaveLength(1);
  expect(within(tarjeta()).getByText('Instaladores: Instalador de terreno')).toBeInTheDocument();
});

test('different work status is retained alongside installer details', async () => {
  const item = armado(1);
  item.seguimiento.despacho = { total_bultos: 2, bultos_enviados: 1, completo: false };
  obtenerArmados.mockResolvedValue([item]);
  render(<Home />);
  await waitFor(() => expect(within(tarjeta()).getByText('Centro 1')).toBeInTheDocument());
  expect(within(tarjeta()).getByText('Despacho parcial')).toBeInTheDocument();
  expect(within(tarjeta()).getAllByText('Instalacion asignada')).toHaveLength(1);
});

test('linked installation shows installers separately and not as a duplicate work card', async () => {
  cargarActividades.mockResolvedValue([{ id_actividad: 7, armado_id: 1, nombre_actividad: 'Instalar sistema',
    area: 'Instalacion', estado: 'En progreso', fecha_inicio: '2000-01-01', centro: { nombre: 'Centro 1', cliente: 'Cliente A' } }]);
  render(<Home />);
  await waitFor(() => expect(within(tarjeta()).getByText('Centro 1')).toBeInTheDocument());
  expect(tarjeta().querySelectorAll('.home-work-item')).toHaveLength(1);
  expect(within(tarjeta()).getByText('Armado: Jorge')).toBeInTheDocument();
  expect(within(tarjeta()).getByText('Instaladores: Instalador de terreno')).toBeInTheDocument();
});
