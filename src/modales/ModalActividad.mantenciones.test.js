import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ModalActividad from './ModalActividad';
import { guardarMantencionActas, cargarMantencionesActas } from '../controllers/actasControllers';
import { obtenerIntervencionesMantencion } from '../api';

jest.mock('../api', () => ({
  obtenerIntervencionesMantencion: jest.fn(), vincularDocumentoMantencion: jest.fn(),
  desvincularDocumentoMantencion: jest.fn(), descargarDocumentoMantencionActas: jest.fn(),
}));
jest.mock('../controllers/actasControllers', () => ({
  guardarMantencionActas: jest.fn(), cargarMantencionesActas: jest.fn(),
  cargarMantencionesSistema: jest.fn(), cargarCentrosActas: jest.fn(),
}));

const caso = { id_soporte: 1239, es_soporte_terreno: true, fecha_mantencion: '2026-10-29',
  problema: 'Mantencion de disuasivos', documentos: [] };
const datos = { resumen: { intervenciones: 1, soportes: 1, sin_documento: 1 }, items: [caso], disponibles: [] };

beforeEach(() => {
  jest.clearAllMocks();
  obtenerIntervencionesMantencion.mockResolvedValue(datos);
  guardarMantencionActas.mockResolvedValue({ success: true });
});

const abrir = () => {
  const onClose = jest.fn();
  const recargarDatos = jest.fn();
  render(<ModalActividad actividad={{ id_centro: 1 }} tipoInicial="mantencion" onClose={onClose} recargarDatos={recargarDatos} />);
  return { onClose, recargarDatos };
};

const completar = () => {
  fireEvent.change(screen.getByLabelText(/Fecha de Manten/), { target: { value: '2026-11-23' } });
  fireEvent.change(screen.getByLabelText('Responsable'), { target: { value: 'Tecnico de terreno' } });
  fireEvent.change(document.getElementById('observacion-documento-mantencion'), { target: { value: 'Trabajo realizado' } });
  fireEvent.change(screen.getByLabelText('Documento', { exact: true }), { target: { files: [new File(['pdf'], 'informe.pdf', { type: 'application/pdf' })] } });
};

test('abre el formulario solo al elegir adjuntar y guarda vinculado sin cerrar la ventana', async () => {
  const { onClose, recargarDatos } = abrir();
  expect(screen.queryByRole('group', { name: 'Adjuntar documento de mantencion' })).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Adjuntar documento al soporte #1239' }));
  expect(screen.getByRole('heading', { name: 'Adjuntar documento - Soporte #1239' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Guardar', exact: true })).not.toBeInTheDocument();
  completar();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y vincular documento' }));
  await screen.findByText('Documento guardado y vinculado al soporte #1239.');
  const form = guardarMantencionActas.mock.calls[0][0];
  expect(form.get('soporte_id')).toBe('1239');
  expect(form.get('centro_id')).toBe('1');
  expect(form.get('documento_mantencion').name).toBe('informe.pdf');
  expect(onClose).not.toHaveBeenCalled();
  expect(recargarDatos).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(obtenerIntervencionesMantencion).toHaveBeenCalledTimes(2));
  expect(cargarMantencionesActas).toHaveBeenCalledTimes(2);
});

test('un error del controlador mantiene el formulario y no anuncia un guardado exitoso', async () => {
  guardarMantencionActas.mockResolvedValue({ success: false, error: { response: { data: { error: 'Sesion invalida.' } } } });
  const { onClose, recargarDatos } = abrir();
  fireEvent.click(await screen.findByRole('button', { name: 'Adjuntar documento al soporte #1239' }));
  completar();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y vincular documento' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sesion invalida.');
  expect(screen.getByLabelText('Responsable')).toHaveValue('Tecnico de terreno');
  expect(screen.getByRole('button', { name: 'Guardar y vincular documento' })).toBeEnabled();
  expect(onClose).not.toHaveBeenCalled();
  expect(recargarDatos).not.toHaveBeenCalled();
});

test('permite conservar el ingreso manual independiente solo cuando se elige esa opcion', async () => {
  abrir();
  await screen.findByText('Falta documento');
  fireEvent.click(screen.getByRole('button', { name: 'Registrar mantencion sin soporte' }));
  completar();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar mantencion sin soporte' }));
  await screen.findByText('Mantencion guardada sin soporte asociado.');
  expect(guardarMantencionActas.mock.calls[0][0].has('soporte_id')).toBe(false);
});

test('no guarda campos incompletos ni permite cambiar el destino mientras se adjunta', async () => {
  abrir();
  fireEvent.click(await screen.findByRole('button', { name: 'Adjuntar documento al soporte #1239' }));
  expect(screen.getByRole('button', { name: 'Adjuntar documento al soporte #1239' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y vincular documento' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Completa la fecha');
  expect(guardarMantencionActas).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar adjunto' }));
  expect(screen.getByRole('button', { name: 'Adjuntar documento al soporte #1239' })).toBeEnabled();
});
