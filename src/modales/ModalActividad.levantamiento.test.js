import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ModalActividad from './ModalActividad';
import { obtenerLevantamientosActas, registrarLevantamientoActas } from '../api';

jest.mock('../api', () => ({
  obtenerLevantamientosActas: jest.fn(), registrarLevantamientoActas: jest.fn(), modificarLevantamientoActas: jest.fn(),
}));
jest.mock('../controllers/actasControllers', () => ({}));

test('ofrece un unico formulario de levantamiento y bloquea cerrar y eliminar mientras guarda', async () => {
  obtenerLevantamientosActas.mockResolvedValue([]);
  let terminar;
  registrarLevantamientoActas.mockImplementation(() => new Promise((resolve) => { terminar = resolve; }));
  const onClose = jest.fn();
  const recargarDatos = jest.fn();
  render(<ModalActividad actividad={{ id_centro: 21, levantamiento_documento: 'doc.pptx' }} onClose={onClose} recargarDatos={recargarDatos} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar levantamiento' })).toBeEnabled());
  expect(screen.queryByText('Documento General')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Guardar', exact: true })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Fecha del levantamiento/), { target: { value: '2026-11-26' } });
  fireEvent.change(screen.getByLabelText('Documento del levantamiento'), { target: { files: [new File(['x'], 'plano.pptx')] } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar levantamiento' }));
  expect(screen.getByRole('button', { name: 'Cerrar', exact: true })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Levantamiento', exact: true })).toBeDisabled();
  expect(screen.getByRole('combobox')).toBeDisabled();
  await act(async () => terminar({}));
  expect(recargarDatos).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
});
