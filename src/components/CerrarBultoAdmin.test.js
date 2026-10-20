import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import CerrarBultoAdmin from './CerrarBultoAdmin';
import { cerrarBultoArmadoAdmin, abrirBultoArmadoAdmin, eliminarBultoArmadoAdmin } from '../api';

jest.mock('../api', () => ({ cerrarBultoArmadoAdmin: jest.fn(), abrirBultoArmadoAdmin: jest.fn(), eliminarBultoArmadoAdmin: jest.fn() }));
const props = { esAdmin: true, armadoId: 8, caja: { nombre: 'Caja 1', estado: 'abierta' }, etiqueta: 'Bulto 1', onCerrado: jest.fn() };
beforeEach(() => { jest.clearAllMocks(); jest.spyOn(window, 'confirm').mockReturnValue(true); });
afterEach(() => jest.restoreAllMocks());

test('only admin sees actions; closed boxes can be reopened', () => {
  const { rerender } = render(<CerrarBultoAdmin {...props} />);
  expect(screen.getByRole('button', { name: 'Cerrar Bulto 1' })).toBeInTheDocument();
  rerender(<CerrarBultoAdmin {...props} esAdmin={false} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  rerender(<CerrarBultoAdmin {...props} caja={{ nombre: 'Caja 1', estado: 'cerrada' }} />);
  expect(screen.getByRole('button', { name: 'Reabrir Bulto 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Eliminar Bulto 1' })).toBeInTheDocument();
});

test('cancel does not send a request', () => {
  window.confirm.mockReturnValue(false);
  render(<CerrarBultoAdmin {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar Bulto 1' }));
  expect(cerrarBultoArmadoAdmin).not.toHaveBeenCalled();
});

test('successful close sends only the selected box and refreshes its detail', async () => {
  const respuesta = { id_armado: 8, caja: 'Caja 1', cajas_estado: { 'Caja 1': 'cerrada', 'Caja 2': 'abierta' } };
  cerrarBultoArmadoAdmin.mockResolvedValue(respuesta);
  render(<CerrarBultoAdmin {...props} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cerrar Bulto 1' })); });
  expect(cerrarBultoArmadoAdmin).toHaveBeenCalledWith(8, 'Caja 1');
  expect(props.onCerrado).toHaveBeenCalledWith(respuesta);
});

test('server rejection leaves box open and displays error', async () => {
  cerrarBultoArmadoAdmin.mockRejectedValue({ response: { data: { message: 'Solo un administrador puede cerrar bultos.' } } });
  render(<CerrarBultoAdmin {...props} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cerrar Bulto 1' })); });
  expect(screen.getByRole('alert')).toHaveTextContent('Solo un administrador');
  expect(props.onCerrado).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Cerrar Bulto 1' })).toBeEnabled();
});

test('reopening calls its endpoint and refreshes state', async () => {
  const resultado = { id_armado: 8, caja: 'Caja 1', estado: 'abierta', cajas_estado: { 'Caja 1': 'abierta' } };
  abrirBultoArmadoAdmin.mockResolvedValue(resultado);
  render(<CerrarBultoAdmin {...props} caja={{ nombre: 'Caja 1', estado: 'cerrada' }} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Reabrir Bulto 1' })); });
  expect(abrirBultoArmadoAdmin).toHaveBeenCalledWith(8, 'Caja 1');
  expect(props.onCerrado).toHaveBeenCalledWith(resultado);
});

test('empty box deletion is confirmed and refreshes detail', async () => {
  const resultado = { id_armado: 8, caja: 'Caja 1', eliminada: true, cajas_estado: {}, total_cajas: 0 };
  eliminarBultoArmadoAdmin.mockResolvedValue(resultado);
  render(<CerrarBultoAdmin {...props} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Eliminar Bulto 1' })); });
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('No se borraran equipos'));
  expect(eliminarBultoArmadoAdmin).toHaveBeenCalledWith(8, 'Caja 1');
  expect(props.onCerrado).toHaveBeenCalledWith(resultado);
});

test('deletion is disabled for occupied boxes but closing remains available', () => {
  render(<CerrarBultoAdmin {...props} caja={{ ...props.caja, equipos: 1 }} />);
  expect(screen.getByRole('button', { name: 'Eliminar Bulto 1' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cerrar Bulto 1' })).toBeEnabled();
  expect(screen.getByText('Para eliminarlo, reasigna primero su contenido.')).toBeInTheDocument();
});
