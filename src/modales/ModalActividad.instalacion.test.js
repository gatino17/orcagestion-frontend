import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ModalActividad from './ModalActividad';
import { obtenerInstalacionesActas, registrarInstalacionActas } from '../api';

jest.mock('../api', () => ({
  obtenerInstalacionesActas: jest.fn(), registrarInstalacionActas: jest.fn(),
}));
jest.mock('../controllers/actasControllers', () => ({
  cargarActasEntregaSistema: jest.fn(), cargarPermisosTrabajoSistema: jest.fn(),
}));

test('integra un unico formulario de instalacion y bloquea el cierre durante el guardado', async () => {
  obtenerInstalacionesActas.mockResolvedValue([{ id_instalacion: 7, centro_id: 21,
    fecha_instalacion: '2026-11-25', documento_acta: 'instalaciones_docs/acta.pdf' }]);
  let terminar;
  registrarInstalacionActas.mockImplementation(() => new Promise((resolve) => { terminar = resolve; }));
  const onClose = jest.fn();
  const recargarDatos = jest.fn();
  render(<ModalActividad actividad={{ id_centro: 21, instalacion_documento: 'instalaciones_docs/acta.pdf' }} tipoInicial="instalacion" onClose={onClose} recargarDatos={recargarDatos} />);
  const guardar = await screen.findByRole('button', { name: 'Guardar cambios' });
  expect(screen.queryByText('Documento General')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Guardar', exact: true })).not.toBeInTheDocument();
  expect(screen.getByText('Actas sistema')).toBeInTheDocument();
  expect(screen.getByText('Permisos sistema')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Instalaci\u00f3n', exact: true })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Instalaci\u00f3n', exact: true })).toBeInTheDocument();
  fireEvent.click(guardar);
  expect(screen.getByRole('button', { name: 'Cerrar', exact: true })).toBeDisabled();
  expect(screen.getByRole('combobox')).toBeDisabled();
  await act(async () => terminar({}));
  expect(recargarDatos).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Cerrar', exact: true })).toBeEnabled();
});

test('los textos de observacion de la ventana mantienen sus acentos', () => {
  render(<ModalActividad actividad={{ id_centro: 21 }} tipoInicial="retiro" onClose={jest.fn()} recargarDatos={jest.fn()} />);
  expect(screen.getByText('Observaci\u00f3n')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Ingrese una observaci\u00f3n')).toBeInTheDocument();
});
