import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import RegistrosDocumentos from './RegistrosDocumentos';
import { cargarActas, cargarClientes } from '../controllers/actasControllers';
import { cargarTodasRazonesSociales } from '../controllers/razonSocialControllers';

jest.mock('../api', () => ({}));
jest.mock('../controllers/actasControllers', () => ({ cargarActas: jest.fn(), cargarClientes: jest.fn() }));
jest.mock('../controllers/razonSocialControllers', () => ({ cargarTodasRazonesSociales: jest.fn() }));
jest.mock('../controllers/servicios_adicionalesControllers', () => ({ agregarServicio: jest.fn(), modificarServicio: jest.fn(), borrarServicio: jest.fn() }));
jest.mock('react-data-table-component', () => function Tabla({ columns, data }) {
  const React = require('react');
  return <div>{data.map((row) => <div key={row.id_centro} data-testid={'centro-' + row.id_centro}>
    {columns.filter((col) => typeof col.cell === 'function').map((col) => <div key={col.name} data-testid={'celda-' + col.name}>{col.cell(row)}</div>)}
  </div>)}</div>;
});
jest.mock('../modales/ModalActividad', () => function Modal({ recargarDatos }) {
  const React = require('react');
  return <button onClick={recargarDatos}>Actualizar respaldo</button>;
});

const centro = { id_centro: 21, nombre_centro: 'Centro prueba', nombre_cliente: 'Cliente' };
let filas;
beforeEach(() => {
  jest.clearAllMocks();
  filas = [centro];
  cargarActas.mockImplementation((ok, servicios) => { ok(filas); servicios([]); });
  cargarClientes.mockImplementation((ok) => ok([]));
  cargarTodasRazonesSociales.mockImplementation((ok) => ok([]));
});
const abrir = async () => {
  render(<RegistrosDocumentos />);
  await screen.findByTestId('centro-21');
};
const icono = (columna) => screen.getByTestId('celda-' + columna).querySelector('.registro-doc-section__icon');

test('traslado aparece inmediatamente despues de cese en la tabla', async () => {
  await abrir();
  const titulos = Array.from(screen.getByTestId('centro-21').querySelectorAll('.registro-doc-section__header strong'));
  expect(titulos.map((titulo) => titulo.textContent)).toEqual([
    'Mantenciones', 'Levantamiento', 'Instalacion', 'Cese', 'Traslado', 'Retiro', 'Inventario',
  ]);
});

test('todas las actividades sin documento muestran el icono rojo', async () => {
  await abrir();
  for (const columna of ['Levantamiento', 'Instalacion', 'Mantenciones', 'Traslado', 'Cese', 'Retiro', 'Inventario']) {
    expect(icono(columna)).toHaveClass('registro-doc-section__icon--missing');
    expect(icono(columna)).toHaveAttribute('title', 'Sin documento');
  }
});

test.each([
  ['Levantamiento', 'levantamiento'], ['Traslado', 'traslado'], ['Cese', 'cese'], ['Retiro', 'retiro'], ['Inventario', 'inventario'],
])('%s con documento conserva el color propio de su actividad', async (columna, campo) => {
  filas = [{ ...centro, [campo + '_documento']: '/documento.pdf' }];
  await abrir();
  expect(icono(columna)).not.toHaveClass('registro-doc-section__icon--missing');
  expect(icono(columna)).toHaveAttribute('title', 'Respaldo disponible');
  expect(icono(columna).closest('.registro-doc-section')).toHaveClass('registro-doc-section--' + campo);
});

test.each([
  { instalacion_documento: '/acta.pdf' }, { cantidad_actas_sistema: 1 }, { cantidad_permisos_sistema: 1 },
])('instalacion con respaldo manual o del sistema conserva su icono verde: %j', async (datos) => {
  filas = [{ ...centro, ...datos }];
  await abrir();
  expect(icono('Instalacion')).not.toHaveClass('registro-doc-section__icon--missing');
});

test('tener una fecha de instalacion no equivale a tener documento', async () => {
  filas = [{ ...centro, instalacion_fecha: '2026-11-26', centro_fecha_instalacion: '2026-11-26' }];
  await abrir();
  expect(icono('Instalacion')).toHaveClass('registro-doc-section__icon--missing');
});

test('un respaldo de armado habilita levantamientos sin exigir otro documento manual', async () => {
  filas = [{ ...centro, levantamiento_respaldos: [{ id_respaldo_armado: 21, nombre: 'Plano', fecha_armado: '2026-11-27' }] }];
  await abrir();
  expect(icono('Levantamiento')).not.toHaveClass('registro-doc-section__icon--missing');
  expect(screen.getByRole('button', { name: '1 respaldo de armado' })).toBeInTheDocument();
  expect(screen.getByText('Fecha del armado')).toBeInTheDocument();
});

test('mantenciones conserva respaldo manual aunque provenga de otra fila agrupada', async () => {
  filas = [{ ...centro, mantencion_fecha: '2026-11-25' },
    { ...centro, mantencion_fecha: '2026-11-26', mantencion_documento: '/mantencion.pdf' }];
  await abrir();
  expect(icono('Mantenciones')).not.toHaveClass('registro-doc-section__icon--missing');
});

test.each([
  { cantidad_mantenciones_sistema: 1 },
  { resumen_intervenciones_mantencion: { intervenciones: 1, soportes: 1, documentados: 1, sin_documento: 0 } },
])('mantenciones con respaldo del sistema o soporte documentado conserva el color: %j', async (datos) => {
  filas = [{ ...centro, ...datos }];
  await abrir();
  expect(icono('Mantenciones')).not.toHaveClass('registro-doc-section__icon--missing');
});

test('una mantencion pendiente de respaldo se marca roja aunque existan otros documentos', async () => {
  filas = [{ ...centro, cantidad_mantenciones_sistema: 1,
    resumen_intervenciones_mantencion: { intervenciones: 2, soportes: 2, documentados: 1, sin_documento: 1 } }];
  await abrir();
  expect(icono('Mantenciones')).toHaveClass('registro-doc-section__icon--missing');
});

test('al recargar despues de guardar desaparece el rojo del levantamiento', async () => {
  await abrir();
  expect(icono('Levantamiento')).toHaveClass('registro-doc-section__icon--missing');
  fireEvent.click(within(screen.getByTestId('celda-Levantamiento')).getByRole('button'));
  filas = [{ ...centro, levantamiento_documento: '/plano.png' }];
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar respaldo' }));
  await screen.findByTitle('Respaldo disponible');
  expect(icono('Levantamiento')).not.toHaveClass('registro-doc-section__icon--missing');
});
