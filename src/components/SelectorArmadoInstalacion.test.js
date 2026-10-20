import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import SelectorArmadoInstalacion from './SelectorArmadoInstalacion';

const armado = (id, cambios = {}) => ({ id_armado: id, centro_id: 1, estado: 'finalizado', fecha_asignacion: '2026-10-01', ...cambios });
test('only installation activities expose the association', () => {
  const { rerender } = render(<SelectorArmadoInstalacion area="Mantencion" armados={[]} value="" />);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  rerender(<SelectorArmadoInstalacion area="Instalacion" armados={[]} value="" />);
  expect(screen.getByRole('combobox')).toBeDisabled();
});

test('filters by center and excludes cancelled, installed or already assigned armados', () => {
  const cambiar = jest.fn();
  render(<SelectorArmadoInstalacion area="Instalacion" centroId="1" value="" onChange={cambiar} armados={[
    armado(1), armado(2, { centro_id: 2 }), armado(3, { estado: 'cancelado' }),
    armado(4, { seguimiento: { instalacion: { fecha_instalacion: '2026-10-01' } } }),
    armado(5, { seguimiento: { asignacion_instalacion: { actividad_id: 9 } } }),
  ]} />);
  const selector = screen.getByLabelText('Armado asociado (opcional)');
  expect(within(selector).getAllByRole('option')).toHaveLength(2);
  fireEvent.change(selector, { target: { value: '1' } });
  expect(cambiar).toHaveBeenCalledWith('1');
});

test('editing retains current association while data is loading', () => {
  render(<SelectorArmadoInstalacion area="Instalacion" centroId="1" armados={[]} value="7" onChange={jest.fn()} />);
  expect(screen.getByRole('combobox')).toHaveValue('7');
  expect(screen.getByRole('option', { name: 'Armado #7 (actual)' })).toBeInTheDocument();
});
