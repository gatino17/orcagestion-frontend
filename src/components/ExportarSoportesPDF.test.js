import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExportarSoportesPDF, { fechaFiltroSoportePDF } from './ExportarSoportesPDF';
import { obtenerPDFRegistrosSoporte } from '../api';

jest.mock('../api', () => ({ obtenerPDFRegistrosSoporte: jest.fn() }));
const registros = [{ id_soporte: 11 }, { id_soporte: 8 }];
const filtros = { busqueda: 'franco', desde: '2026-10-01', hasta: '2026-10-31' };
let click;
beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => 'blob:soportes-pdf');
  URL.revokeObjectURL = jest.fn();
  click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  obtenerPDFRegistrosSoporte.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
});
afterEach(() => click.mockRestore());

test('descarga todos los registros recibidos con los filtros vigentes', async () => {
  render(<ExportarSoportesPDF registros={registros} filtros={filtros} />);
  fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
  await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
  expect(obtenerPDFRegistrosSoporte).toHaveBeenCalledWith([11, 8], filtros);
  expect(click.mock.instances[0]).toHaveAttribute('href', 'blob:soportes-pdf');
  expect(click.mock.instances[0].download).toMatch(/^Registros-soporte-\d{4}-\d{2}-\d{2}\.pdf$/);
});

test('sin resultados no permite generar un PDF vacio', () => {
  render(<ExportarSoportesPDF registros={[]} filtros={filtros} />);
  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.getByRole('button')).toHaveAttribute('title', 'No hay resultados para exportar.');
  fireEvent.click(screen.getByRole('button'));
  expect(obtenerPDFRegistrosSoporte).not.toHaveBeenCalled();
});

test('rango invertido se informa y no permite exportar', () => {
  render(<ExportarSoportesPDF registros={registros} filtros={{ desde: '2026-11-30', hasta: '2026-11-01' }} />);
  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('Revisa el rango');
});

test('permite rangos abiertos y no duplica solicitudes durante el envio', async () => {
  let resolver;
  obtenerPDFRegistrosSoporte.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
  render(<ExportarSoportesPDF registros={registros} filtros={{ desde: '2026-01-01', hasta: '' }} />);
  const boton = screen.getByRole('button');
  fireEvent.click(boton);
  fireEvent.click(boton);
  expect(screen.getByRole('button', { name: 'Exportando...' })).toBeDisabled();
  expect(obtenerPDFRegistrosSoporte).toHaveBeenCalledTimes(1);
  await act(async () => resolver(new Blob(['%PDF'], { type: 'application/pdf' })));
});

test('muestra errores JSON del backend y permite reintentar', async () => {
  const datos = new Blob(['error'], { type: 'application/json' });
  datos.text = async () => JSON.stringify({ error: 'Solo un administrador puede exportar.' });
  obtenerPDFRegistrosSoporte.mockRejectedValueOnce({ response: { data: datos } });
  render(<ExportarSoportesPDF registros={registros} filtros={filtros} />);
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Solo un administrador puede exportar.');
  expect(click).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
});

test('no descarga HTML como si fuera un PDF', async () => {
  obtenerPDFRegistrosSoporte.mockResolvedValueOnce(new Blob(['<html>Error</html>'], { type: 'text/html' }));
  render(<ExportarSoportesPDF registros={registros} filtros={filtros} />);
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo exportar');
  expect(click).not.toHaveBeenCalled();
});

test('las fechas conservan el dia local sin conversion a UTC', () => {
  expect(fechaFiltroSoportePDF(new Date(2026, 9, 31, 23, 59))).toBe('2026-10-31');
  expect(fechaFiltroSoportePDF(null)).toBe('');
});
