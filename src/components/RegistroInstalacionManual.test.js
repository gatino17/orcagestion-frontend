import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RegistroInstalacionManual from './RegistroInstalacionManual';
import { obtenerInstalacionesActas, registrarInstalacionActas } from '../api';

jest.mock('../api', () => ({
  API_BASE_URL: 'https://orca.example/api',
  obtenerInstalacionesActas: jest.fn(), registrarInstalacionActas: jest.fn(),
}));
const existente = { id_instalacion: 7, centro_id: 21, fecha_instalacion: '2026-11-20', inicio_monitoreo: '2026-11-21',
  documento_acta: 'instalaciones_docs/acta.pdf', observacion: 'Instalacion anterior' };
const abrir = () => {
  const onSaved = jest.fn();
  const onBusyChange = jest.fn();
  render(<RegistroInstalacionManual actividad={{ id_centro: 21 }} onSaved={onSaved} onBusyChange={onBusyChange} />);
  return { onSaved, onBusyChange };
};
const adjuntar = (name = 'acta.pdf', contents = 'pdf') => fireEvent.change(screen.getByLabelText('Documento de instalacion'), {
  target: { files: [new File([contents], name, { type: 'application/pdf' })] },
});
beforeEach(() => {
  jest.clearAllMocks();
  obtenerInstalacionesActas.mockResolvedValue([]);
  registrarInstalacionActas.mockResolvedValue({ id_instalacion: 7 });
});

test('precarga el registro propio y ofrece abrir el documento en el servidor correcto', async () => {
  obtenerInstalacionesActas.mockResolvedValue([{ ...existente, centro_id: 24, id_instalacion: 1 }, existente]);
  abrir();
  await waitFor(() => expect(screen.getByLabelText(/Fecha de instalacion/)).toHaveValue('2026-11-20'));
  expect(obtenerInstalacionesActas).toHaveBeenCalledWith(21);
  expect(screen.getByLabelText(/Inicio de monitoreo/)).toHaveValue('2026-11-21');
  expect(screen.getByLabelText(/Observaciones/)).toHaveValue('Instalacion anterior');
  expect(screen.getByRole('link', { name: 'Abrir documento actual' })).toHaveAttribute('href', 'https://orca.example/api/filtro/documento/Instalaciones/7');
  expect(screen.getByRole('link', { name: 'Abrir documento' })).toHaveAttribute('target', '_blank');
});

test('guarda un adjunto manual con fechas y observacion y actualiza sin cerrar', async () => {
  const { onSaved, onBusyChange } = abrir();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar instalacion' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText(/Fecha de instalacion/), { target: { value: '2026-11-25' } });
  fireEvent.change(screen.getByLabelText(/Observaciones/), { target: { value: ' Respaldo firmado ' } });
  adjuntar();
  expect(screen.getByText('acta.pdf')).toBeInTheDocument();
  obtenerInstalacionesActas.mockResolvedValue([existente]);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar instalacion' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  const data = registrarInstalacionActas.mock.calls[0][0];
  expect(data.get('centro_id')).toBe('21');
  expect(data.get('fecha_instalacion')).toBe('2026-11-25');
  expect(data.get('observacion')).toBe('Respaldo firmado');
  expect(data.get('documento_acta').name).toBe('acta.pdf');
  expect(onBusyChange.mock.calls).toEqual([[true], [false]]);
  expect(await screen.findByText(/El documento ya esta disponible/)).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: 'Abrir documento actual' })).toBeInTheDocument();
});

test('permite modificar observaciones sin reemplazar el documento', async () => {
  obtenerInstalacionesActas.mockResolvedValue([existente]);
  abrir();
  const boton = await screen.findByRole('button', { name: 'Guardar cambios' });
  fireEvent.change(screen.getByLabelText(/Observaciones/), { target: { value: '' } });
  fireEvent.click(boton);
  await waitFor(() => expect(registrarInstalacionActas).toHaveBeenCalledTimes(1));
  expect(registrarInstalacionActas.mock.calls[0][0].has('documento_acta')).toBe(false);
  expect(registrarInstalacionActas.mock.calls[0][0].get('observacion')).toBe('');
});

test('un error conserva los datos y permite reintentar sin anunciar exito', async () => {
  registrarInstalacionActas.mockRejectedValue({ response: { data: { error: 'No se pudo almacenar el archivo.' } } });
  const { onSaved } = abrir();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar instalacion' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText(/Fecha de instalacion/), { target: { value: '2026-11-25' } });
  adjuntar();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar instalacion' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo almacenar el archivo.');
  expect(screen.getByLabelText(/Fecha de instalacion/)).toHaveValue('2026-11-25');
  expect(screen.getByText('acta.pdf')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Guardar instalacion' })).toBeEnabled();
  expect(onSaved).not.toHaveBeenCalled();
  expect(screen.queryByText(/Instalacion guardada/)).not.toBeInTheDocument();
});

test('valida fecha y adjunto antes de enviar', async () => {
  abrir();
  const boton = screen.getByRole('button', { name: 'Guardar instalacion' });
  await waitFor(() => expect(boton).toBeEnabled());
  fireEvent.click(boton);
  expect(screen.getByRole('alert')).toHaveTextContent('Indica la fecha');
  fireEvent.change(screen.getByLabelText(/Fecha de instalacion/), { target: { value: '2026-11-25' } });
  fireEvent.click(boton);
  expect(screen.getByRole('alert')).toHaveTextContent('Adjunta el documento');
  adjuntar('mal.exe');
  expect(screen.getByRole('alert')).toHaveTextContent('PDF, JPG o PNG');
  expect(registrarInstalacionActas).not.toHaveBeenCalled();
});

test('bloquea el guardado si falla la carga y ofrece reintentar', async () => {
  obtenerInstalacionesActas.mockRejectedValueOnce(new Error('offline'));
  abrir();
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar');
  expect(screen.getByRole('button', { name: 'Guardar instalacion' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar instalacion' })).toBeEnabled());
});

test('no duplica solicitudes mientras se esta guardando', async () => {
  let terminar;
  registrarInstalacionActas.mockImplementation(() => new Promise((resolve) => { terminar = resolve; }));
  obtenerInstalacionesActas.mockResolvedValue([existente]);
  abrir();
  const boton = await screen.findByRole('button', { name: 'Guardar cambios' });
  fireEvent.click(boton);
  fireEvent.click(boton);
  expect(registrarInstalacionActas).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
  await act(async () => terminar({}));
});
