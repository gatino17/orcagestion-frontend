import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import LineaTiempoArmado from './LineaTiempoArmado';

const armado = { id_armado: 5, estado: 'finalizado', armado_equipos_pendientes: 1,
  seguimiento: { fecha_asignacion: '2026-10-01', fecha_inicio: '2026-10-02', fecha_fin_armado: '2026-10-10',
    despacho: { total_bultos: 2, bultos_enviados: 2, completo: true, fecha_completo: '2026-10-15',
      bultos_recibidos: 2, recepcion_completa: true, fecha_recepcion_completa: '2026-10-19' },
    puede_confirmar_instalacion: true,
    asignacion_instalacion: { asignada: true, fecha_inicio: '2000-01-01', instaladores: [{ nombre: 'Instalador' }] },
  },
};

test('six stages, dates, pending equipment and confirmation action', () => {
  const confirmar = jest.fn();
  render(<LineaTiempoArmado armado={armado} onConfirmar={confirmar} />);
  const etapas = within(screen.getByRole('list', { name: 'Seguimiento del armado' })).getAllByRole('listitem');
  expect(etapas).toHaveLength(6);
  expect(within(etapas[0]).getByLabelText('Completado')).toBeInTheDocument();
  expect(within(etapas[4]).getByText('Recepcion en centro')).toBeInTheDocument();
  expect(within(etapas[4]).getByText(/19.*10.*2026/)).toBeInTheDocument();
  expect(etapas[5]).toHaveAttribute('aria-current', 'step');
  expect(screen.getByText('2 de 2 bultos enviados / 2 de 2 recibidos en centro')).toBeInTheDocument();
  expect(screen.getByText(/Finalizado con 1 equipos pendientes/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Confirmar instalacion/ }));
  expect(confirmar).toHaveBeenCalledWith(armado);
});

test('unauthorized and partial dispatch have no confirmation button', () => {
  const { rerender } = render(<LineaTiempoArmado armado={{ ...armado, seguimiento: { ...armado.seguimiento, puede_confirmar_instalacion: false } }} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  rerender(<LineaTiempoArmado armado={{ ...armado, seguimiento: { ...armado.seguimiento, despacho: { completo: false, total_bultos: 2, bultos_enviados: 1 } } }} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByText('1 de 2 bultos enviados / 0 de 2 recibidos en centro')).toBeInTheDocument();
});

test('installed shows author and linked acta instead of confirmation button', () => {
  render(<LineaTiempoArmado armado={{ ...armado, seguimiento: { ...armado.seguimiento, instalacion: {
    fecha_instalacion: '2026-10-20', confirmado_por_nombre: 'Jorge', acta_entrega_id: 2,
  } } }} />);
  expect(screen.getByText(/Instalacion confirmada por Jorge/)).toHaveTextContent('Acta #2');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getAllByLabelText('Completado')).toHaveLength(6);
});

test('partial reception displays count and stays pending', () => {
  render(<LineaTiempoArmado armado={{ ...armado, seguimiento: { ...armado.seguimiento, despacho: {
    ...armado.seguimiento.despacho, bultos_recibidos: 1, recepcion_completa: false,
    fecha_recepcion_completa: null, fecha_recepcion_inicio: '2026-10-18',
  } } }} />);
  const recepcion = screen.getByText('Recepcion en centro').closest('li');
  expect(recepcion).toHaveAttribute('aria-current', 'step');
  expect(within(recepcion).getByLabelText('Pendiente')).toBeInTheDocument();
  expect(screen.getByText(/1 de 2 recibidos en centro/)).toBeInTheDocument();
});

test('legacy receipt without timestamp is explicit instead of using dispatch date', () => {
  render(<LineaTiempoArmado armado={{ ...armado, seguimiento: { ...armado.seguimiento, despacho: {
    ...armado.seguimiento.despacho, fecha_recepcion_completa: null,
  } } }} />);
  const recepcion = screen.getByText('Recepcion en centro').closest('li');
  expect(within(recepcion).getByLabelText('Completado')).toBeInTheDocument();
  expect(within(recepcion).getByText('Sin fecha registrada')).toBeInTheDocument();
});
