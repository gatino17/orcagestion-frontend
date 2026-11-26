import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Soporte from './Soporte';
import { cargarCentrosClientes } from '../controllers/centrosControllers';
import { obtenerPDFRegistrosSoporte, obtenerSoportes, obtenerCasosIsmael, obtenerFallasDispositivos, obtenerEquipos } from '../api';

jest.mock('../api', () => ({ obtenerPDFRegistrosSoporte: jest.fn(), obtenerSoportes: jest.fn(), obtenerCasosIsmael: jest.fn(),
  obtenerFallasDispositivos: jest.fn(), obtenerEquipos: jest.fn(), resolverPlantillaDiagrama: jest.fn(),
  eliminarCasoExternoSoporte: jest.fn(), enviarAvisoSoporteTerreno: jest.fn(), crearSoporte: jest.fn(),
  actualizarSoporte: jest.fn(), eliminarSoporte: jest.fn() }));
jest.mock('../controllers/centrosControllers', () => ({ cargarCentrosClientes: jest.fn() }));
jest.mock('../components/DiagramaLogicoViewer', () => () => null);
jest.mock('../components/VistaGeneralViewer', () => () => null);
jest.mock('jwt-decode', () => ({ jwtDecode: jest.fn() }));
// Simula la paginacion: solo dibuja diez filas, pero recibe el conjunto completo.
jest.mock('react-data-table-component', () => ({ data }) => <div data-testid="tabla-soportes">
  {data.slice(0, 10).map((row) => <div key={row.id_soporte}>Fila {row.id_soporte}</div>)}
</div>);

const anio = new Date().getFullYear();
const registros = Array.from({ length: 14 }, (_, index) => ({ id_soporte: index + 1,
  centro: { id_centro: 1, nombre: 'Centro Norte', cliente: 'Cliente Prueba' }, problema: 'Revisar conexion',
  fecha_soporte: `${anio}-10-${String(index + 1).padStart(2, '0')}`, creado_por_nombre: 'Franco Dinamarca',
  estado: 'resuelto', tipo: 'remoto', prioridad: 'media', solucion: 'Cable reparado', origen: 'orca' }));
let click;
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem('token', 'test-session');
  jwtDecode.mockReturnValue({ rol: 'admin' });
  obtenerSoportes.mockResolvedValue([...registros, { ...registros[0], id_soporte: 99, creado_por_nombre: 'Otra persona' },
    { ...registros[0], id_soporte: 100, fecha_soporte: `${anio - 1}-10-01` }]);
  obtenerCasosIsmael.mockResolvedValue([]);
  obtenerFallasDispositivos.mockResolvedValue([]);
  obtenerEquipos.mockResolvedValue([]);
  cargarCentrosClientes.mockResolvedValue([]);
  obtenerPDFRegistrosSoporte.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
  URL.createObjectURL = jest.fn(() => 'blob:pdf-soporte');
  URL.revokeObjectURL = jest.fn();
  click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { click.mockRestore(); localStorage.clear(); });
const abrir = async () => {
  render(<MemoryRouter><Soporte /></MemoryRouter>);
  await screen.findByText('Mostrando 15 resultados');
};

test('admin exporta los catorce resultados del creador, no solo diez filas de la tabla', async () => {
  await abrir();
  fireEvent.change(screen.getByLabelText('Buscar soporte'), { target: { value: 'franco' } });
  expect(screen.getByText('Mostrando 14 resultados')).toBeInTheDocument();
  expect(screen.getByTestId('tabla-soportes').children).toHaveLength(10);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' })); });
  await waitFor(() => expect(obtenerPDFRegistrosSoporte).toHaveBeenCalledTimes(1));
  expect(obtenerPDFRegistrosSoporte).toHaveBeenCalledWith(Array.from({ length: 14 }, (_, index) => 14 - index),
    expect.objectContaining({ busqueda: 'franco', desde: '', hasta: '', periodo_desde: `${anio}-01-01`, periodo_hasta: `${anio}-12-31` }));
});

test('el PDF respeta simultaneamente el creador y ambos extremos del rango de fechas', async () => {
  await abrir();
  fireEvent.change(screen.getByLabelText('Buscar soporte'), { target: { value: 'franco' } });
  fireEvent.change(screen.getByLabelText('Rango desde'), { target: { value: `${anio}-10-05` } });
  fireEvent.change(screen.getByLabelText('Rango hasta'), { target: { value: `${anio}-10-08` } });
  expect(screen.getByText('Mostrando 4 resultados')).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' })); });
  await waitFor(() => expect(obtenerPDFRegistrosSoporte).toHaveBeenCalledWith([8, 7, 6, 5],
    expect.objectContaining({ busqueda: 'franco', desde: `${anio}-10-05`, hasta: `${anio}-10-08` })));
});

test('sin resultados el PDF se deshabilita y Ver cambios sigue funcionando', async () => {
  await abrir();
  fireEvent.change(screen.getByLabelText('Buscar soporte'), { target: { value: 'inexistente' } });
  expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Ver cambios' }));
  expect(screen.getByRole('button', { name: 'Ocultar cambios' })).toBeInTheDocument();
});

test('el usuario no admin no ve ni puede accionar la exportacion', async () => {
  jwtDecode.mockReturnValue({ rol: 'inventario' });
  await abrir();
  expect(screen.queryByRole('button', { name: 'Exportar PDF' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ver cambios' })).toBeInTheDocument();
  expect(obtenerPDFRegistrosSoporte).not.toHaveBeenCalled();
});
