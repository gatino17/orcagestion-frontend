import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Calendario from './Calendario';
import { cargarActividades, agregarActividad, modificarActividad } from '../controllers/actividadesControllers';
import { agregarArmado } from '../controllers/armadosControllers';
import { cargarEncargados } from '../controllers/encargadosControllers';
import { cargarCentrosClientes } from '../controllers/centrosControllers';
import { cargarUsuarios } from '../controllers/usuariosControllers';
import { obtenerArmados, obtenerGuiasSalidaArmado, obtenerSoportes, obtenerBloqueosTecnicos } from '../api';

jest.mock('../api', () => ({ obtenerArmados: jest.fn(), obtenerGuiasSalidaArmado: jest.fn(), obtenerSoportes: jest.fn(),
  obtenerBloqueosTecnicos: jest.fn(), marcarCorreoSoporteEnviado: jest.fn(), obtenerHistorialCorreosSoporte: jest.fn(),
  crearBloqueoTecnico: jest.fn(), eliminarBloqueoTecnico: jest.fn(), API_BASE_URL: '/api' }));
jest.mock('../controllers/actividadesControllers', () => ({ cargarActividades: jest.fn(), agregarActividad: jest.fn(), modificarActividad: jest.fn(), borrarActividad: jest.fn() }));
jest.mock('../controllers/armadosControllers', () => ({ agregarArmado: jest.fn() }));
jest.mock('../controllers/encargadosControllers', () => ({ cargarEncargados: jest.fn() }));
jest.mock('../controllers/centrosControllers', () => ({ cargarCentrosClientes: jest.fn() }));
jest.mock('../controllers/usuariosControllers', () => ({ cargarUsuarios: jest.fn() }));
jest.mock('@fullcalendar/react', () => () => null);
jest.mock('@fullcalendar/daygrid', () => ({}));
jest.mock('@fullcalendar/interaction', () => ({}));
jest.mock('@fullcalendar/timegrid', () => ({}));
jest.mock('react-data-table-component', () => function MockDataTable({ columns = [], data = [] }) {
  const React = require('react');
  const acciones = columns.find((columna) => columna.name === 'Acciones');
  return React.createElement('div', null, data.filter((item) => item.id_actividad).map((item) =>
    React.createElement('div', { key: item.id_actividad, 'data-testid': `actividad-${item.id_actividad}` }, acciones?.cell(item))));
});
jest.mock('socket.io-client', () => ({ io: () => ({ on: jest.fn(), off: jest.fn(), disconnect: jest.fn() }) }));
jest.setTimeout(15000);

beforeEach(() => {
  jest.clearAllMocks();
  cargarActividades.mockResolvedValue([]);
  cargarEncargados.mockResolvedValue([{ id_encargado: 9, user_id: 90, nombre_encargado: 'Instalador' }]);
  cargarCentrosClientes.mockResolvedValue([{ id: 1, id_centro: 1, nombre: 'Centro A', cliente_id: 1, cliente: 'Cliente A' }]);
  cargarUsuarios.mockImplementation(async (setter) => setter([{ id: 90, name: 'Instalador', rol: 'tecnico' }]));
  obtenerSoportes.mockResolvedValue([]);
  obtenerBloqueosTecnicos.mockResolvedValue([]);
  obtenerGuiasSalidaArmado.mockResolvedValue([]);
  obtenerArmados.mockResolvedValue([{ id_armado: 4, centro_id: 1, estado: 'finalizado', fecha_asignacion: '2026-10-01' }]);
  agregarActividad.mockResolvedValue({ id_actividad: 7 });
  agregarArmado.mockResolvedValue({ id_armado: 8 });
  modificarActividad.mockResolvedValue({});
});

const nuevaActividad = async () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Calendario /></MemoryRouter>);
  await waitFor(() => expect(cargarEncargados).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /Nueva actividad/ }));
  const modal = screen.getByText('Crear actividad').closest('.modal-content');
  const control = (label, role = 'combobox') => within(within(modal).getByText(label).parentElement).getByRole(role);
  fireEvent.change(control('Tipo de actividad'), { target: { value: 'Instalacion' } });
  fireEvent.change(control('Cliente'), { target: { value: '1' } });
  fireEvent.change(control('Centro'), { target: { value: '1' } });
  fireEvent.change(control('Tecnico'), { target: { value: '9' } });
  fireEvent.change(control('Nombre de la actividad', 'textbox'), { target: { value: 'Instalar equipos' } });
  return modal;
};

test('el correo es opcional y envia la solicitud al guardar una nueva actividad', async () => {
  agregarActividad.mockResolvedValue({ id_actividad: 7, aviso_correo: { estado: 'enviado', mensaje: 'Correo enviado.', sin_correo: [] } });
  const modal = await nuevaActividad();
  const checkbox = within(modal).getByRole('checkbox', { name: 'Notificar por correo a los asignados' });
  expect(checkbox).not.toBeChecked();
  fireEvent.click(checkbox);
  await act(async () => fireEvent.click(within(modal).getByRole('button', { name: /Guardar cambios/ })));
  expect(agregarActividad).toHaveBeenCalledWith(expect.objectContaining({ notificar_por_correo: true }));
  expect(screen.getByRole('status')).toHaveTextContent('Actividad guardada correctamente. Correo enviado.');
  expect(screen.getByRole('status')).toHaveClass('alert-success');
  expect(screen.queryByText('Crear actividad')).not.toBeInTheDocument();
});

test('sin marcar el checkbox no solicita correo', async () => {
  const modal = await nuevaActividad();
  await act(async () => fireEvent.click(within(modal).getByRole('button', { name: /Guardar cambios/ })));
  expect(agregarActividad).toHaveBeenCalledWith(expect.objectContaining({ notificar_por_correo: false }));
});

test('fallo de correo confirma guardado y advierte sin dejar el formulario para duplicar', async () => {
  agregarActividad.mockResolvedValue({ id_actividad: 7, aviso_correo: { estado: 'error', mensaje: 'No se pudo conectar al correo.' } });
  const modal = await nuevaActividad();
  fireEvent.click(within(modal).getByRole('checkbox'));
  await act(async () => fireEvent.click(within(modal).getByRole('button', { name: /Guardar cambios/ })));
  expect(screen.getByRole('status')).toHaveClass('alert-warning');
  expect(screen.getByRole('status')).toHaveTextContent('Actividad guardada correctamente. No se pudo conectar al correo.');
  expect(agregarActividad).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Crear actividad')).not.toBeInTheDocument();
});

test('avisa si falta correo a un asignado aunque se haya enviado a los demas', async () => {
  agregarActividad.mockResolvedValue({ id_actividad: 7, aviso_correo: { estado: 'enviado',
    mensaje: 'Correo enviado. Sin correo valido: Apoyo.', sin_correo: ['Apoyo'] } });
  const modal = await nuevaActividad();
  fireEvent.click(within(modal).getByRole('checkbox'));
  await act(async () => fireEvent.click(within(modal).getByRole('button', { name: /Guardar cambios/ })));
  expect(screen.getByRole('status')).toHaveClass('alert-warning');
  expect(screen.getByRole('status')).toHaveTextContent('Apoyo');
});

test('mientras guarda y envia evita otro guardado y bloquea el formulario', async () => {
  let resolver;
  agregarActividad.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
  const modal = await nuevaActividad();
  fireEvent.click(within(modal).getByRole('checkbox'));
  fireEvent.click(within(modal).getByRole('button', { name: /Guardar cambios/ }));
  const enviando = within(modal).getByRole('button', { name: 'Guardando y enviando correo...' });
  expect(enviando).toBeDisabled();
  fireEvent.click(enviando);
  expect(agregarActividad).toHaveBeenCalledTimes(1);
  expect(within(modal).getByRole('checkbox')).toBeDisabled();
  await act(async () => resolver({ id_actividad: 7, aviso_correo: { estado: 'enviado', mensaje: 'Correo enviado.' } }));
});

test('asignar armado incluye la solicitud de correo y usa la respuesta del backend', async () => {
  agregarArmado.mockResolvedValue({ id_armado: 8, aviso_correo: { estado: 'enviado', mensaje: 'Correo enviado.', sin_correo: [] } });
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Calendario /></MemoryRouter>);
  await waitFor(() => expect(cargarEncargados).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /Asignar armado/ }));
  const modal = screen.getByRole('heading', { name: /Asignar armado/ }).closest('.modal-content');
  const selectors = within(modal).getAllByRole('combobox');
  const cliente = selectors.find((select) => within(select).queryByRole('option', { name: 'Cliente A' }));
  fireEvent.change(cliente, { target: { value: '1' } });
  const centro = selectors.find((select) => within(select).queryByRole('option', { name: /Centro A/ }));
  fireEvent.change(centro, { target: { value: '1' } });
  const tecnico = selectors.find((select) => within(select).queryByRole('option', { name: 'Instalador' }));
  fireEvent.change(tecnico, { target: { value: '90' } });
  const checkbox = within(modal).getByRole('checkbox');
  expect(checkbox).not.toBeChecked();
  fireEvent.click(checkbox);
  await act(async () => fireEvent.click(within(modal).getByRole('button', { name: /Guardar asignacion/ })));
  expect(agregarArmado).toHaveBeenCalledWith(expect.objectContaining({ tecnico_id: 90, centro_id: 1, notificar_por_correo: true }));
  expect(screen.getByRole('status')).toHaveTextContent('Armado asignado correctamente. Correo enviado.');
});

test('calendar sends chosen armado together with installer and planned date', async () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Calendario /></MemoryRouter>);
  await waitFor(() => expect(obtenerArmados).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /Nueva actividad/ }));
  const modal = screen.getByText('Crear actividad').closest('.modal-content');
  const control = (label, role = 'combobox') => within(within(modal).getByText(label).parentElement).getByRole(role);
  fireEvent.change(control('Tipo de actividad'), { target: { value: 'Instalacion' } });
  fireEvent.change(control('Cliente'), { target: { value: '1' } });
  fireEvent.change(control('Centro'), { target: { value: '1' } });
  const selector = within(modal).getByLabelText('Armado asociado (opcional)');
  await waitFor(() => expect(within(selector).getByRole('option', { name: /Armado #4/ })).toBeInTheDocument());
  fireEvent.change(selector, { target: { value: '4' } });
  fireEvent.change(control('Tecnico'), { target: { value: '9' } });
  fireEvent.change(control('Nombre de la actividad', 'textbox'), { target: { value: 'Instalar equipos' } });
  fireEvent.change(within(modal).getByText('Fecha inicio').parentElement.querySelector('input'), { target: { value: '2026-10-20' } });
  await act(async () => { fireEvent.click(within(modal).getByRole('button', { name: /Guardar cambios/ })); });
  expect(agregarActividad).toHaveBeenCalledWith(expect.objectContaining({
    armado_id: 4, centro_id: 1, area: 'Instalacion', tecnico_encargado: 9, fecha_inicio: '2026-10-20',
  }));
});

test('edit activity displays the installation end date supplied by its report', async () => {
  cargarActividades.mockResolvedValue([{
    id_actividad: 58, nombre_actividad: 'Instalacion Isla Colorada', area: 'Instalacion', estado: 'Finalizado',
    armado_id: 4, fecha_inicio: '2026-09-10', fecha_termino: '2026-09-13',
    centro: { id_centro: 1, nombre: 'Centro A', cliente_id: 1, cliente: 'Cliente A' },
    encargado_principal: { id_encargado: 9, nombre_encargado: 'Instalador' }, tecnicos_asignados: [],
  }]);
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Calendario /></MemoryRouter>);
  const fila = await screen.findByTestId('actividad-58');
  fireEvent.click(fila.querySelector('button.btn-warning'));
  const modal = screen.getByText('Editar actividad').closest('.modal-content');
  expect(within(modal).getByText(/Fecha t.rmino/).parentElement.querySelector('input')).toHaveValue('2026-09-13');
  expect(within(modal).getByText('Fecha inicio').parentElement.querySelector('input')).toHaveValue('2026-09-10');
});
