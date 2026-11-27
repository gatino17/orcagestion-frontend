import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RespaldoLevantamientoArmado from './RespaldoLevantamientoArmado';
import { obtenerRespaldoLevantamientoArmado } from '../api';

jest.mock('../api', () => ({ obtenerRespaldoLevantamientoArmado: jest.fn() }));
const documento = { id_respaldo_armado: 21, id_armado: 8, tipo_documento: 'pdf', nombre: 'Plano del sistema', fecha_armado: '2026-11-27' };
let abrir;
let ventana;
beforeEach(() => {
  jest.useFakeTimers();
  ventana = { opener: {}, location: { href: '' }, close: jest.fn() };
  abrir = jest.spyOn(window, 'open').mockReturnValue(ventana);
  URL.createObjectURL = jest.fn(() => 'blob:respaldo');
  URL.revokeObjectURL = jest.fn();
  obtenerRespaldoLevantamientoArmado.mockReset();
  obtenerRespaldoLevantamientoArmado.mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
});
afterEach(() => { abrir.mockRestore(); jest.clearAllTimers(); jest.useRealTimers(); });

test('abre el archivo con sesion sin navegar a una URL privada sin autenticar', async () => {
  render(<RespaldoLevantamientoArmado documento={documento} />);
  expect(screen.getByText('Plano del sistema')).toBeInTheDocument();
  expect(screen.getByText('Respaldo de armado #8')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver documento' }));
  await waitFor(() => expect(ventana.location.href).toBe('blob:respaldo'));
  expect(ventana.opener).toBeNull();
  expect(obtenerRespaldoLevantamientoArmado).toHaveBeenCalledWith(21);
  expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
});

test('un archivo ausente muestra el error y permite reintentar', async () => {
  obtenerRespaldoLevantamientoArmado.mockRejectedValueOnce({ response: { data: { message: 'El archivo no esta disponible en este servidor.' } } });
  render(<RespaldoLevantamientoArmado documento={documento} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ver documento' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('no esta disponible');
  expect(ventana.close).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Ver documento' }));
  await waitFor(() => expect(ventana.location.href).toBe('blob:respaldo'));
});

test('si el navegador bloquea la ventana ofrece un enlace manual', async () => {
  abrir.mockReturnValue(null);
  render(<RespaldoLevantamientoArmado documento={documento} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ver documento' }));
  expect(await screen.findByRole('link')).toHaveAttribute('href', 'blob:respaldo');
});

test('delega la vista previa de Consulta Centro sin abrir una ventana', async () => {
  const onAbrir = jest.fn();
  render(<RespaldoLevantamientoArmado documento={documento} onAbrir={onAbrir} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ver documento' }));
  expect(abrir).not.toHaveBeenCalled();
  expect(obtenerRespaldoLevantamientoArmado).not.toHaveBeenCalled();
  const visor = onAbrir.mock.calls[0][0];
  expect(visor.titulo).toBe('Plano del sistema');
  await visor.cargar();
  expect(obtenerRespaldoLevantamientoArmado).toHaveBeenCalledWith(21);
});
