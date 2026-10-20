import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import LineaTiempoArmado from './LineaTiempoArmado';

const armado = { id_armado: 5, estado: 'finalizado', armado_equipos_pendientes: 1,
  seguimiento: { fecha_asignacion: '2026-10-01', fecha_inicio: '2026-10-02', fecha_fin_armado: '2026-10-10',
    despacho: { total_bultos: 2, bultos_enviados: 2, completo: true, fecha_completo: '2026-10-15' },
    puede_confirmar_instalacion: true,
  },
};

test('five stages, dates, pending equipment and confirmation action', () => {
  const confirmar = jest.fn();
  render(<LineaTiempoArmado armado={armado} onConfirmar={confirmar} />);
  const etapas = within(screen.getByRole('list', { name: 'Seguimiento del armado' })).getAllByRole('listitem');
  expect(etapas).toHaveLength(5);
  expect(within(etapas[0]).getByLabelText('Completado')).toBeInTheDocument();
  expect(etapas[4]).toHaveAttribute('aria-current', 'step');
  expect(screen.getByText('2 de 2 bultos enviados')).toBeInTheDocument();
  expect(screen.getByText(/Finalizado con 1 equipos pendientes/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Confirmar instalacion/ }));
  expect(confirmar).toHaveBeenCalledWith(armado);
});

test('unauthorized and partial dispatch have no confirmation button', () => {
  const { rerender } = render(<LineaTiempoArmado armado={{ ...armado, seguimiento: { ...armado.seguimiento, puede_confirmar_instalacion: false } }} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  rerender(<LineaTiempoArmado armado={{ ...armado, seguimiento: { ...armado.seguimiento, despacho: { completo: false, total_bultos: 2, bultos_enviados: 1 } } }} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByText('1 de 2 bultos enviados')).toBeInTheDocument();
});

test('installed shows author and linked acta instead of confirmation button', () => {
  render(<LineaTiempoArmado armado={{ ...armado, seguimiento: { ...armado.seguimiento, instalacion: {
    fecha_instalacion: '2026-10-20', confirmado_por_nombre: 'Jorge', acta_entrega_id: 2,
  } } }} />);
  expect(screen.getByText(/Instalacion confirmada por Jorge/)).toHaveTextContent('Acta #2');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getAllByLabelText('Completado')).toHaveLength(5);
});
