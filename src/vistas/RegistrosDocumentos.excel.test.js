import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RegistrosDocumentos from './RegistrosDocumentos';
import { cargarActas, cargarClientes } from '../controllers/actasControllers';
import { cargarTodasRazonesSociales } from '../controllers/razonSocialControllers';
import { obtenerExcelActividades } from '../api';

jest.mock('../api', () => ({ obtenerExcelActividades: jest.fn() }));
jest.mock('../controllers/actasControllers', () => ({ cargarActas: jest.fn(), cargarClientes: jest.fn() }));
jest.mock('../controllers/razonSocialControllers', () => ({ cargarTodasRazonesSociales: jest.fn() }));
jest.mock('../controllers/servicios_adicionalesControllers', () => ({ agregarServicio: jest.fn(), modificarServicio: jest.fn(), borrarServicio: jest.fn() }));
jest.mock('../modales/ModalActividad', () => () => null);
jest.mock('react-data-table-component', () => ({ data }) => <div data-testid="tabla-actividades">
  {data.slice(0, 10).map((row) => <div key={row.id_centro}>{row.nombre_centro}</div>)}
</div>);

const filas = [...Array.from({ length: 14 }, (_, index) => ({ id_centro: index + 1, nombre_centro: 'Norte ' + (index + 1),
  nombre_cliente: 'Cliente A', cliente_id: '1', estado: 'activo' })),
  { id_centro: 99, nombre_centro: 'Sur', nombre_cliente: 'Cliente B', cliente_id: '2' }];
let click;
beforeEach(() => {
  jest.clearAllMocks();
  cargarActas.mockImplementation((ok, servicios, filtros) => {
    ok(filas.filter((row) => (!filtros.id_cliente || row.cliente_id === filtros.id_cliente)
      && (!filtros.nombre_centro || row.nombre_centro.toLowerCase().includes(filtros.nombre_centro.toLowerCase()))));
    servicios([]);
  });
  cargarClientes.mockImplementation((ok) => ok([{ id_cliente: 1, nombre: 'Cliente A' }, { id_cliente: 2, nombre: 'Cliente B' }]));
  cargarTodasRazonesSociales.mockImplementation((ok) => ok([]));
  obtenerExcelActividades.mockResolvedValue(new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  URL.createObjectURL = jest.fn(() => 'blob:actividades-excel');
  URL.revokeObjectURL = jest.fn();
  click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => click.mockRestore());

const abrir = async () => {
  render(<RegistrosDocumentos />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Excel' })).toBeEnabled());
};

test('el boton esta al lado de limpiar filtros y exporta sin limitarse a diez filas', async () => {
  await abrir();
  const excel = screen.getByRole('button', { name: 'Excel' });
  expect(screen.getByRole('button', { name: 'Limpiar filtros' }).parentElement).toContainElement(excel);
  expect(screen.getAllByTestId('tabla-actividades')[0].children).toHaveLength(10);
  await act(async () => { fireEvent.click(excel); });
  expect(obtenerExcelActividades).toHaveBeenCalledWith({ id_cliente: '', nombre_centro: '' });
});

test('aplica cliente y centro y limpiar filtros vuelve a incluir a todos', async () => {
  await abrir();
  await act(async () => { fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '1' } }); });
  await act(async () => { fireEvent.change(screen.getByLabelText('Centro'), { target: { value: 'Norte 1' } }); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Excel' })); });
  expect(obtenerExcelActividades).toHaveBeenLastCalledWith({ id_cliente: '1', nombre_centro: 'Norte 1' });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' })); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Excel' })); });
  expect(obtenerExcelActividades).toHaveBeenLastCalledWith({ id_cliente: '', nombre_centro: '' });
});

test('cuando no hay actividades no habilita una descarga vacia', async () => {
  cargarActas.mockImplementation((ok, servicios) => { ok([]); servicios([]); });
  render(<RegistrosDocumentos />);
  await waitFor(() => expect(cargarActas).toHaveBeenCalled());
  expect(screen.getByRole('button', { name: 'Excel' })).toBeDisabled();
});
