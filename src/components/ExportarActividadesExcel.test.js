import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExportarActividadesExcel from './ExportarActividadesExcel';
import { obtenerExcelActividades } from '../api';

jest.mock('../api', () => ({ obtenerExcelActividades: jest.fn() }));
const filtros = { id_cliente: '1', nombre_centro: 'Norte' };
const archivo = () => new Blob(['PKxlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
let click;
beforeEach(() => {
  jest.clearAllMocks();
  obtenerExcelActividades.mockResolvedValue(archivo());
  URL.createObjectURL = jest.fn(() => 'blob:actividades-excel');
  URL.revokeObjectURL = jest.fn();
  click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => click.mockRestore());

test('descarga un archivo Excel con los filtros elegidos', async () => {
  render(<ExportarActividadesExcel filtros={filtros} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Excel' })); });
  expect(obtenerExcelActividades).toHaveBeenCalledWith(filtros);
  expect(click).toHaveBeenCalledTimes(1);
  expect(click.mock.instances[0]).toHaveAttribute('href', 'blob:actividades-excel');
  expect(click.mock.instances[0].download).toBe('Actividades-documentos.xlsx');
});

test('el boton deshabilitado no realiza solicitudes', () => {
  render(<ExportarActividadesExcel filtros={filtros} disabled />);
  expect(screen.getByRole('button')).toBeDisabled();
  fireEvent.click(screen.getByRole('button'));
  expect(obtenerExcelActividades).not.toHaveBeenCalled();
});

test('no duplica solicitudes mientras se genera el archivo', async () => {
  let resolver;
  obtenerExcelActividades.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
  render(<ExportarActividadesExcel filtros={filtros} />);
  const boton = screen.getByRole('button');
  fireEvent.click(boton);
  fireEvent.click(boton);
  expect(screen.getByRole('button', { name: 'Exportando...' })).toBeDisabled();
  expect(obtenerExcelActividades).toHaveBeenCalledTimes(1);
  await act(async () => resolver(archivo()));
});

test('muestra errores del backend y permite reintentar', async () => {
  const datos = new Blob(['error'], { type: 'application/json' });
  datos.text = async () => JSON.stringify({ error: 'No tienes permiso para exportar.' });
  obtenerExcelActividades.mockRejectedValueOnce({ response: { data: datos } });
  render(<ExportarActividadesExcel filtros={filtros} />);
  await act(async () => { fireEvent.click(screen.getByRole('button')); });
  expect(screen.getByRole('alert')).toHaveTextContent('No tienes permiso para exportar.');
  expect(click).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole('button')); });
  await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
});

test('no descarga un error HTML como si fuera una planilla', async () => {
  obtenerExcelActividades.mockResolvedValue(new Blob(['<html>Error</html>'], { type: 'text/html' }));
  render(<ExportarActividadesExcel filtros={filtros} />);
  await act(async () => { fireEvent.click(screen.getByRole('button')); });
  expect(screen.getByRole('alert')).toHaveTextContent('No se pudo descargar');
  expect(click).not.toHaveBeenCalled();
});
