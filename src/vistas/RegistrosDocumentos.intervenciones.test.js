import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import RegistrosDocumentos from './RegistrosDocumentos';
import { cargarActas, cargarClientes } from '../controllers/actasControllers';
import { cargarTodasRazonesSociales } from '../controllers/razonSocialControllers';
jest.mock('../api', () => ({}));
jest.mock('../controllers/actasControllers', () => ({ cargarActas: jest.fn(), cargarClientes: jest.fn() }));
jest.mock('../controllers/razonSocialControllers', () => ({ cargarTodasRazonesSociales: jest.fn() }));
jest.mock('../controllers/servicios_adicionalesControllers', () => ({ agregarServicio: jest.fn(), modificarServicio: jest.fn(), borrarServicio: jest.fn() }));
jest.mock('react-data-table-component', () => function Tabla({ columns, data }) {
  const React = require('react');
  return <div>{data.map((row) => <div key={row.id_centro}>{columns.find((col) => col.name === 'Mantenciones').cell(row)}</div>)}</div>;
});
jest.mock('../modales/ModalActividad', () => function Modal({ actividad, tipoInicial, recargarDatos }) {
  const React = require('react');
  return <div role="dialog">{tipoInicial} del centro {actividad.id_centro}<button onClick={recargarDatos}>Actualizar vinculos</button></div>;
});
const pendiente = { id_centro: 21, nombre_centro: 'Aldachildo', nombre_cliente: 'Cliente',
  resumen_intervenciones_mantencion: { intervenciones: 1, soportes: 1, sin_documento: 1, ultima_fecha: '2026-11-23' } };
beforeEach(() => {
  jest.clearAllMocks();
  cargarActas.mockImplementation((ok, servicios) => { ok([pendiente]); servicios([]); });
  cargarClientes.mockImplementation((ok) => ok([]));
  cargarTodasRazonesSociales.mockImplementation((ok) => ok([]));
});
test('muestra soporte sin documento y abre el gestor de mantenciones del centro', async () => {
  render(<RegistrosDocumentos />);
  const resumen = await screen.findByText('1 intervencion');
  expect(screen.getByText('1 registro soporte')).toBeInTheDocument();
  expect(screen.getByText('Falta documento: 1')).toHaveClass('bg-danger');
  fireEvent.click(resumen.closest('[role="button"]'));
  expect(screen.getByRole('dialog')).toHaveTextContent('mantencion del centro 21');
});
test('recargar tras el vinculo cambia el aviso sin contar el informe como otra intervencion', async () => {
  render(<RegistrosDocumentos />);
  fireEvent.click((await screen.findByText('1 intervencion')).closest('[role="button"]'));
  cargarActas.mockImplementation((ok, servicios) => { ok([{ ...pendiente,
    cantidad_mantenciones_sistema: 1, resumen_intervenciones_mantencion: { intervenciones: 1, soportes: 1, sin_documento: 0 } }]); servicios([]); });
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar vinculos' }));
  await screen.findByText('Soportes documentados');
  expect(screen.getByText('1 intervencion')).toBeInTheDocument();
  expect(screen.queryByText('Falta documento: 1')).not.toBeInTheDocument();
});
