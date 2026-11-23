import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import IntervencionesMantencion, { DocumentosIntervencion, ResumenIntervencionesMantencion } from './IntervencionesMantencion';
import { obtenerIntervencionesMantencion, vincularDocumentoMantencion, desvincularDocumentoMantencion, descargarDocumentoMantencionActas } from '../api';

jest.mock('../api', () => ({ obtenerIntervencionesMantencion: jest.fn(), vincularDocumentoMantencion: jest.fn(),
  desvincularDocumentoMantencion: jest.fn(), descargarDocumentoMantencionActas: jest.fn() }));
const doc = { tipo: 'manual', id: 11, centro_id: 1, fecha: '2026-11-23', responsable: 'Tecnico', disponible: true };
const caso = { id_soporte: 1, es_soporte_terreno: true, fecha_mantencion: '2026-11-23', problema: 'Camara sin energia', documentos: [] };
const sinDoc = { resumen: { intervenciones: 2, soportes: 1, sin_documento: 1 }, items: [caso], disponibles: [doc] };
const conDoc = { resumen: { intervenciones: 1, soportes: 1, sin_documento: 0 }, items: [{ ...caso, documentos: [{ ...doc, vinculo_id: 5 }] }], disponibles: [] };
beforeEach(() => {
  jest.clearAllMocks();
  obtenerIntervencionesMantencion.mockResolvedValue(sinDoc);
  vincularDocumentoMantencion.mockResolvedValue({});
  desvincularDocumentoMantencion.mockResolvedValue({});
});

test('muestra el soporte pendiente y vincula su documento con ids sin duplicar la intervencion', async () => {
  const recargar = jest.fn();
  obtenerIntervencionesMantencion.mockResolvedValueOnce(sinDoc).mockResolvedValue(conDoc);
  render(<IntervencionesMantencion centroId={1} onChange={recargar} />);
  await screen.findByText('Falta documento');
  expect(screen.getByRole('button', { name: 'Vincular documento' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Documento de esta intervencion'), { target: { value: 'manual:11' } });
  fireEvent.click(screen.getByRole('button', { name: 'Vincular documento' }));
  await screen.findByText('Documentacion disponible');
  expect(vincularDocumentoMantencion).toHaveBeenCalledWith(1, { tipo: 'manual', documento_id: 11 });
  expect(screen.getByText('1 intervencion')).toBeInTheDocument();
  expect(screen.queryByText('Falta documento')).not.toBeInTheDocument();
  expect(recargar).toHaveBeenCalledTimes(1);
});

test('desvincula sin eliminar el documento y restablece la advertencia', async () => {
  obtenerIntervencionesMantencion.mockResolvedValueOnce(conDoc).mockResolvedValue(sinDoc);
  render(<IntervencionesMantencion centroId={1} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Desvincular manual #11' }));
  await screen.findByText('Falta documento');
  expect(desvincularDocumentoMantencion).toHaveBeenCalledWith(1, 5);
});

test('un conflicto conserva el listado y muestra el motivo sin anunciar exito', async () => {
  vincularDocumentoMantencion.mockRejectedValue({ response: { data: { error: 'Documento de otra intervencion.' } } });
  render(<IntervencionesMantencion centroId={1} />);
  await screen.findByText('Falta documento');
  fireEvent.change(screen.getByLabelText('Documento de esta intervencion'), { target: { value: 'manual:11' } });
  fireEvent.click(screen.getByRole('button', { name: 'Vincular documento' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Documento de otra intervencion.');
  expect(screen.getByText('Falta documento')).toBeInTheDocument();
});

test('fallo de carga no se interpreta como falta de documento y permite reintentar', async () => {
  obtenerIntervencionesMantencion.mockRejectedValueOnce(new Error('Sin red'));
  render(<IntervencionesMantencion centroId={1} />);
  await screen.findByRole('alert');
  expect(screen.queryByText('Falta documento')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar intervenciones' }));
  await screen.findByText('Falta documento');
});

test('ignora respuestas de un centro anterior', async () => {
  let resolver;
  obtenerIntervencionesMantencion.mockImplementation((id) => id === 1 ? new Promise((r) => { resolver = r; })
    : Promise.resolve({ resumen: { intervenciones: 0, soportes: 0, sin_documento: 0 }, items: [], disponibles: [] }));
  const vista = render(<IntervencionesMantencion centroId={1} />);
  vista.rerender(<IntervencionesMantencion centroId={2} />);
  await screen.findByText('Sin soportes de terreno registrados.');
  await act(async () => resolver(sinDoc));
  expect(screen.queryByText('Camara sin energia')).not.toBeInTheDocument();
  expect(screen.getByText('0 intervenciones')).toBeInTheDocument();
});

test('los vinculos por actividad no se ofrecen como desvinculables', async () => {
  obtenerIntervencionesMantencion.mockResolvedValue({ ...conDoc, items: [{ ...caso, documentos: [{ ...doc, tipo: 'sistema', por_actividad: true }] }] });
  render(<IntervencionesMantencion centroId={1} />);
  await screen.findByText(/vinculado por su actividad/);
  expect(screen.queryByRole('button', { name: /Desvincular/ })).not.toBeInTheDocument();
});

test('abre documentos manuales y enlaza informes del sistema con su centro y numero', () => {
  render(<DocumentosIntervencion documentos={[doc, { ...doc, tipo: 'sistema', id: 21 }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ver documento manual #11' }));
  expect(descargarDocumentoMantencionActas).toHaveBeenCalledWith(11);
  expect(screen.getByRole('link', { name: 'Consultar informe sistema #21' })).toHaveAttribute('href', '/informes-centros?mantencion=21&centro_id=1');
});

test('resumen identifica un soporte sin documento con indicador rojo', () => {
  render(<ResumenIntervencionesMantencion resumen={{ intervenciones: 1, soportes: 1, sin_documento: 1 }} />);
  expect(screen.getByText('1 intervencion')).toBeInTheDocument();
  expect(screen.getByText('1 registro soporte')).toBeInTheDocument();
  expect(screen.getByText('Falta documento: 1')).toHaveClass('bg-danger');
});

test('ofrece adjuntar al soporte y no muestra un vinculo deshabilitado si no hay documentos', async () => {
  obtenerIntervencionesMantencion.mockResolvedValue({ ...sinDoc, disponibles: [] });
  const adjuntar = jest.fn();
  render(<IntervencionesMantencion centroId={1} onAdjuntar={adjuntar} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Adjuntar documento al soporte #1' }));
  expect(adjuntar).toHaveBeenCalledWith(caso);
  expect(screen.queryByRole('button', { name: 'Vincular documento' })).not.toBeInTheDocument();
  expect(screen.getByText(/No hay documentos sin asociar/)).toBeInTheDocument();
});
