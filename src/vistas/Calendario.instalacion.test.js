import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Calendario from './Calendario';
import { cargarActividades, agregarActividad } from '../controllers/actividadesControllers';
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
jest.mock('react-data-table-component', () => () => null);
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
