import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ConsultaCentro from './ConsultaCentro';
import { obtenerClientes, obtenerCentrosPorCliente, obtenerHistorialCentro } from '../controllers/consultaCentroControllers';
import { obtenerActasEntrega, obtenerPermisosTrabajo } from '../api';

jest.mock('../controllers/consultaCentroControllers', () => ({
  obtenerClientes: jest.fn(), obtenerCentrosPorCliente: jest.fn(),
  obtenerHistorialCentro: jest.fn(), obtenerHistorialCentroPDF: jest.fn(),
}));
jest.mock('../api', () => ({ obtenerActasEntrega: jest.fn(), obtenerPermisosTrabajo: jest.fn() }));

const remoto = {
  id_soporte: 1, tipo: 'remoto', fecha_soporte: '2026-11-23',
  problema: 'Radar descalibrado', solucion: 'Calibracion remota',
};
const terreno = {
  id_soporte: 2, tipo: 'terreno', fecha_soporte: '2026-11-21',
  problema: 'Camara sin energia', solucion: 'Se reemplazo la fuente',
  cambio_equipo: true, equipo_cambiado: 'Fuente 12 V',
};
const manual = {
  id_mantencion: 2, fecha_mantencion: '2026-11-20',
  responsable: 'Tecnico centro', observacion: 'Mantencion preventiva anterior',
  documento: '/documentos/mantencion.pdf',
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  obtenerClientes.mockImplementation((ok) => ok([{ id_cliente: 1, nombre: 'Aquachile' }]));
  obtenerCentrosPorCliente.mockImplementation((id, ok) => ok([{ id_centro: 21, nombre: 'Isla Colorada' }]));
  obtenerActasEntrega.mockResolvedValue([]);
  obtenerPermisosTrabajo.mockResolvedValue([]);
});

async function mostrarHistorial(soportes = [], mantenciones = []) {
  obtenerHistorialCentro.mockImplementation((id, ok) => ok({
    centro: { id_centro: Number(id), nombre: 'Isla Colorada', estado: 'Activo' },
    historial: { soportes, mantenciones }, equipos_ip: [], inventario: [],
  }));
  render(<ConsultaCentro />);
  fireEvent.change(screen.getByLabelText('Seleccionar cliente'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Seleccionar centro'), { target: { value: '21' } });
  await screen.findByText('Sin actas del sistema registradas.');
  return {
    mantenciones: screen.getByRole('heading', { name: 'Mantenciones' }).closest('.timeline-section'),
    soportes: screen.getByRole('heading', { name: 'Reportes de soporte' }).closest('.timeline-section'),
  };
}

test('ubica terreno en Mantenciones y remoto en Reportes sin duplicar eventos', async () => {
  const secciones = await mostrarHistorial([remoto, terreno]);
  expect(within(secciones.mantenciones).getByText(terreno.problema)).toBeInTheDocument();
  expect(within(secciones.mantenciones).getByText(terreno.solucion)).toBeInTheDocument();
  expect(within(secciones.mantenciones).getByText(terreno.equipo_cambiado)).toBeInTheDocument();
  expect(within(secciones.mantenciones).queryByText(remoto.problema)).not.toBeInTheDocument();
  expect(within(secciones.soportes).getByText(remoto.problema)).toBeInTheDocument();
  expect(within(secciones.soportes).getByText(remoto.solucion)).toBeInTheDocument();
  expect(within(secciones.soportes).queryByText(terreno.problema)).not.toBeInTheDocument();
  expect(screen.getByText('2 eventos')).toBeInTheDocument();
});

test('conserva mantenciones manuales con sus documentos y ordena ambos origenes por fecha', async () => {
  const secciones = await mostrarHistorial([terreno], [
    { ...manual, id_mantencion: 3, fecha_mantencion: '2026-11-22', observacion: 'Mantencion posterior', documento: null },
    manual,
  ]);
  const items = secciones.mantenciones.querySelectorAll('.timeline-item');
  expect(items).toHaveLength(3);
  expect(items[0]).toHaveTextContent(manual.observacion);
  expect(items[0]).toHaveTextContent(manual.responsable);
  expect(within(items[0]).getByRole('link', { name: 'Ver documento' })).toHaveAttribute('href', manual.documento);
  expect(items[1]).toHaveTextContent(terreno.problema);
  expect(items[1].querySelector('.timeline-date')).toHaveTextContent(/21.*11.*2026/);
  expect(items[2]).toHaveTextContent('Mantencion posterior');
  expect(within(secciones.soportes).getByText('Sin registros')).toBeInTheDocument();
  expect(screen.getByText('3 eventos')).toBeInTheDocument();
});

test.each(['Terreno', ' TERRENO '])('reconoce el tipo %s sin depender de mayusculas o espacios', async (tipo) => {
  const secciones = await mostrarHistorial([{ ...terreno, tipo }]);
  expect(within(secciones.mantenciones).getByText(terreno.problema)).toBeInTheDocument();
  expect(within(secciones.soportes).queryByText(terreno.problema)).not.toBeInTheDocument();
  expect(screen.getByText('1 eventos')).toBeInTheDocument();
});

test('no oculta soportes antiguos sin tipo ni cambia sus datos', async () => {
  const sinTipo = { ...remoto, tipo: null, fecha_soporte: null };
  const secciones = await mostrarHistorial([sinTipo]);
  expect(within(secciones.soportes).getByText(sinTipo.problema)).toBeInTheDocument();
  expect(within(secciones.soportes).getByText('No indicado')).toBeInTheDocument();
  expect(within(secciones.mantenciones).getByText('Sin registros')).toBeInTheDocument();
  expect(sinTipo).toEqual({ ...remoto, tipo: null, fecha_soporte: null });
});

test('un historial sin soportes mantiene las secciones vacias', async () => {
  const secciones = await mostrarHistorial();
  expect(within(secciones.mantenciones).getByText('Sin registros')).toBeInTheDocument();
  expect(within(secciones.soportes).getByText('Sin registros')).toBeInTheDocument();
  expect(screen.getByText('0 eventos')).toBeInTheDocument();
});

test('usa la intervencion agrupada del backend sin volver a contar su documento', async () => {
  obtenerHistorialCentro.mockImplementation((id, ok) => ok({
    centro: { id_centro: 21, nombre: 'Isla Colorada' },
    historial: { soportes: [terreno], mantenciones: [manual], intervenciones_mantencion: [{
      ...terreno, es_soporte_terreno: true, historial_key: 'soporte-2', fecha_mantencion: terreno.fecha_soporte,
      documentos: [{ tipo: 'manual', id: 2, centro_id: 21, disponible: true }],
    }] },
  }));
  render(<ConsultaCentro />);
  fireEvent.change(screen.getByLabelText('Seleccionar cliente'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Seleccionar centro'), { target: { value: '21' } });
  await screen.findByText('Documentacion disponible');
  await screen.findByText('Sin actas del sistema registradas.');
  expect(screen.getByText('1 eventos')).toBeInTheDocument();
  expect(screen.queryByText('Falta documento')).not.toBeInTheDocument();
  expect(screen.getByText(terreno.problema)).toBeInTheDocument();
});
