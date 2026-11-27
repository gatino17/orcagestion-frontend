import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RegistroLevantamientoManual from './RegistroLevantamientoManual';
import { obtenerLevantamientosActas, registrarLevantamientoActas, modificarLevantamientoActas } from '../api';

jest.mock('../api', () => ({
  API_BASE_URL: 'https://orca.example/api', obtenerLevantamientosActas: jest.fn(),
  registrarLevantamientoActas: jest.fn(), modificarLevantamientoActas: jest.fn(),
}));
const existente = { id_levantamiento: 7, centro_id: 21, fecha_levantamiento: '2026-11-20', documento_asociado: 'levantamientos_docs/plano.pptx' };
const abrir = () => {
  const onSaved = jest.fn();
  const onBusyChange = jest.fn();
  render(<RegistroLevantamientoManual actividad={{ id_centro: 21 }} onSaved={onSaved} onBusyChange={onBusyChange} />);
  return { onSaved, onBusyChange };
};
const adjuntar = (nombre = 'plano.pptx', contenido = 'presentacion') => {
  const archivo = new File([contenido], nombre);
  fireEvent.change(screen.getByLabelText('Documento del levantamiento'), { target: { files: [archivo] } });
  return archivo;
};
const completar = async () => {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar levantamiento' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText(/Fecha del levantamiento/), { target: { value: '2026-11-26' } });
};
beforeEach(() => {
  jest.clearAllMocks();
  obtenerLevantamientosActas.mockResolvedValue([]);
  registrarLevantamientoActas.mockResolvedValue({ id_levantamiento: 7 });
  modificarLevantamientoActas.mockResolvedValue({});
});

test('precarga solo el centro propio y usa el servidor configurado para abrir el documento', async () => {
  obtenerLevantamientosActas.mockResolvedValue([existente, { ...existente, centro_id: 22, id_levantamiento: 99 }]);
  abrir();
  await waitFor(() => expect(screen.getByLabelText(/Fecha del levantamiento/)).toHaveValue('2026-11-20'));
  expect(obtenerLevantamientosActas).toHaveBeenCalledWith(21);
  expect(screen.getByRole('link', { name: 'Abrir documento actual' })).toHaveAttribute('href', 'https://orca.example/api/filtro/documento/Levantamientos/7');
  expect(screen.getByText('Levantamientos registrados')).toHaveTextContent('1');
  expect(screen.getByLabelText('Documento del levantamiento')).toHaveAttribute('accept', '.ppt,.pptx,.pdf,.jpg,.jpeg,.png');
});

test('los respaldos de armado se muestran aparte y no se editan como levantamientos manuales', async () => {
  obtenerLevantamientosActas.mockResolvedValue([{ origen: 'armado', centro_id: 21, id_armado: 8,
    id_respaldo_armado: 31, nombre: 'Plano compartido', tipo_documento: 'pdf' }]);
  abrir();
  expect(await screen.findByText('Plano compartido')).toBeInTheDocument();
  expect(screen.getByText(/se administran desde la observacion/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Guardar levantamiento' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
});

test.each(['plano.ppt', 'plano.PPTX'])('guarda PowerPoint %s y actualiza sin cerrar ni duplicar', async (nombre) => {
  const { onSaved, onBusyChange } = abrir();
  await completar();
  adjuntar(nombre);
  expect(screen.getByText(nombre)).toBeInTheDocument();
  obtenerLevantamientosActas.mockResolvedValue([existente]);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar levantamiento' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  const data = registrarLevantamientoActas.mock.calls[0][0];
  expect(data.get('centro_id')).toBe('21');
  expect(data.get('fecha_levantamiento')).toBe('2026-11-26');
  expect(data.get('documento_asociado').name).toBe(nombre);
  expect(onBusyChange.mock.calls).toEqual([[true], [false]]);
  expect(await screen.findByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  expect(screen.getByText(/Levantamiento guardado/)).toBeInTheDocument();
});

test('editar la fecha conserva el archivo y usa PUT en vez de crear otro registro', async () => {
  obtenerLevantamientosActas.mockResolvedValue([existente]);
  abrir();
  const guardar = await screen.findByRole('button', { name: 'Guardar cambios' });
  fireEvent.change(screen.getByLabelText(/Fecha del levantamiento/), { target: { value: '2026-11-25' } });
  fireEvent.click(guardar);
  await waitFor(() => expect(modificarLevantamientoActas).toHaveBeenCalledTimes(1));
  expect(modificarLevantamientoActas.mock.calls[0][0]).toBe(7);
  expect(modificarLevantamientoActas.mock.calls[0][1].has('documento_asociado')).toBe(false);
  expect(registrarLevantamientoActas).not.toHaveBeenCalled();
});

test('permite elegir un levantamiento anterior y mantiene esa seleccion tras guardarlo', async () => {
  obtenerLevantamientosActas.mockResolvedValue([existente, { ...existente, id_levantamiento: 8, fecha_levantamiento: '2026-11-21' }]);
  abrir();
  await waitFor(() => expect(screen.getByLabelText(/Fecha del levantamiento/)).toHaveValue('2026-11-21'));
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(modificarLevantamientoActas).toHaveBeenCalledTimes(1));
  expect(modificarLevantamientoActas.mock.calls[0][0]).toBe(7);
  await waitFor(() => expect(screen.getByText('Registro #7 - En edicion')).toBeInTheDocument());
});

test('valida fecha, documento, extension, archivo vacio y limite de 25 MB', async () => {
  abrir();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar levantamiento' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Guardar levantamiento' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Indica la fecha');
  await completar();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar levantamiento' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Adjunta el documento');
  adjuntar('mal.exe');
  expect(screen.getByRole('alert')).toHaveTextContent('25 MB');
  adjuntar('vacio.pptx', '');
  expect(screen.getByRole('alert')).toHaveTextContent('con contenido');
  const grande = new File(['x'], 'grande.pptx');
  Object.defineProperty(grande, 'size', { value: 25 * 1024 * 1024 + 1 });
  fireEvent.change(screen.getByLabelText('Documento del levantamiento'), { target: { files: [grande] } });
  expect(screen.getByRole('alert')).toHaveTextContent('25 MB');
  expect(registrarLevantamientoActas).not.toHaveBeenCalled();
});

test('conserva el formulario y el archivo si el servidor rechaza el guardado', async () => {
  registrarLevantamientoActas.mockRejectedValue({ response: { data: { error: 'No se pudo almacenar.' } } });
  const { onSaved } = abrir();
  await completar();
  adjuntar();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar levantamiento' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo almacenar.');
  expect(screen.getByText('plano.pptx')).toBeInTheDocument();
  expect(screen.getByLabelText(/Fecha del levantamiento/)).toHaveValue('2026-11-26');
  expect(onSaved).not.toHaveBeenCalled();
});

test('bloquea el guardado si falla la carga y permite reintentar', async () => {
  obtenerLevantamientosActas.mockRejectedValueOnce(new Error('Sin conexion'));
  abrir();
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar');
  expect(screen.getByRole('button', { name: 'Guardar levantamiento' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar levantamiento' })).toBeEnabled());
});

test('evita el doble envio mientras guarda', async () => {
  let terminar;
  registrarLevantamientoActas.mockImplementation(() => new Promise((resolve) => { terminar = resolve; }));
  abrir();
  await completar();
  adjuntar();
  const guardar = screen.getByRole('button', { name: 'Guardar levantamiento' });
  fireEvent.click(guardar);
  fireEvent.click(guardar);
  expect(registrarLevantamientoActas).toHaveBeenCalledTimes(1);
  await act(async () => terminar({}));
});
