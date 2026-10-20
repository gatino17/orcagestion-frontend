import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConfirmarInstalacionArmado from './ConfirmarInstalacionArmado';
import { confirmarInstalacionArmado } from '../api';

jest.mock('../api', () => ({ confirmarInstalacionArmado: jest.fn() }));
const armado = { id_armado: 5, centro: { nombre: 'Centro A' }, seguimiento: { actas: [
  { id_acta_entrega: 7, fecha_registro: '2026-10-18', firmada: true },
] } };
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
beforeEach(() => jest.clearAllMocks());

test('submits date, optional acta and observation then updates card and closes', async () => {
  const instalacion = { fecha_instalacion: '2026-10-20' };
  confirmarInstalacionArmado.mockResolvedValue({ instalacion });
  const confirmado = jest.fn();
  const cerrar = jest.fn();
  render(<ConfirmarInstalacionArmado armado={armado} onCerrar={cerrar} onConfirmado={confirmado} />);
  fireEvent.change(screen.getByLabelText('Fecha de instalacion *'), { target: { value: '2026-10-20' } });
  fireEvent.change(screen.getByLabelText('Acta de entrega (opcional)'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Observaciones'), { target: { value: 'Prueba final OK' } });
  await act(async () => { fireEvent.submit(screen.getByRole('button', { name: 'Confirmar instalacion' }).closest('form')); });
  expect(confirmarInstalacionArmado).toHaveBeenCalledWith(5, { fecha_instalacion: '2026-10-20', acta_entrega_id: 7, observacion: 'Prueba final OK' });
  expect(confirmado).toHaveBeenCalledWith(5, instalacion);
  expect(cerrar).toHaveBeenCalledTimes(1);
});

test('API error preserves entered values and leaves modal open', async () => {
  confirmarInstalacionArmado.mockRejectedValue({ response: { data: { message: 'Despacho incompleto' } } });
  const cerrar = jest.fn();
  render(<ConfirmarInstalacionArmado armado={armado} onCerrar={cerrar} onConfirmado={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Observaciones'), { target: { value: 'Conservar' } });
  await act(async () => { fireEvent.submit(screen.getByRole('button', { name: 'Confirmar instalacion' }).closest('form')); });
  expect(screen.getByRole('alert')).toHaveTextContent('Despacho incompleto');
  expect(screen.getByLabelText('Observaciones')).toHaveValue('Conservar');
  expect(cerrar).not.toHaveBeenCalled();
});

test('in-flight request disables actions and restores scroll on unmount', async () => {
  let resolve;
  confirmarInstalacionArmado.mockReturnValue(new Promise((done) => { resolve = done; }));
  const { unmount } = render(<ConfirmarInstalacionArmado armado={armado} onCerrar={jest.fn()} onConfirmado={jest.fn()} />);
  fireEvent.submit(screen.getByRole('button', { name: 'Confirmar instalacion' }).closest('form'));
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
  expect(document.body.style.overflow).toBe('hidden');
  await act(async () => { resolve({ instalacion: {} }); });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar instalacion' })).toBeEnabled());
  unmount();
  expect(document.body.style.overflow).toBe('');
});
