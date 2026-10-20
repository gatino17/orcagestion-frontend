import React from 'react';
import { render, screen } from '@testing-library/react';
import EstadoBultosArmado, { resumenCierreBultos } from './EstadoBultosArmado';

const estados = (cerrados, total) => Object.fromEntries(Array.from({ length: total }, (_, i) => [`Caja ${i + 1}`, i < cerrados ? 'cerrada' : 'abierta']));

test('19 of 21 closed shows only numerator red', () => {
  render(<EstadoBultosArmado armado={{ total_cajas: 21, cajas_estado: estados(19, 21) }} />);
  const indicador = screen.getByLabelText('19 de 21 bultos cerrados; 2 pendientes de cierre');
  expect(indicador).toHaveTextContent('19/21');
  expect(indicador.querySelector('strong')).toHaveClass('text-danger');
  expect(indicador.querySelector('span')).not.toHaveClass('text-danger');
});

test('all boxes closed turns the numerator green', () => {
  render(<EstadoBultosArmado armado={{ total_cajas: 21, cajas_estado: estados(21, 21) }} />);
  const indicador = screen.getByLabelText('21 de 21 bultos cerrados; 0 pendientes de cierre');
  expect(indicador).toHaveTextContent('21/21');
  expect(indicador.querySelector('strong')).toHaveClass('text-success');
});

test('finishing armado or reporting totals does not mean boxes are closed', () => {
  expect(resumenCierreBultos({ estado: 'finalizado', porcentaje_armado: 100, total_cajas: 21 })).toEqual({ cerrados: 0, total: 21, pendientes: 21 });
});

test('virtual boxes and repeated aliases do not inflate closure counts', () => {
  expect(resumenCierreBultos({ cajas_estado: { 'Pendiente de caja': 'cerrada', 'Sin caja': 'cerrada', 'Caja 1': 'cerrada', 'Bulto 1': 'abierta', 'Caja 2': 'cerrada' } }))
    .toEqual({ cerrados: 1, total: 2, pendientes: 1 });
});

test('empty or malformed data renders neutral 0/0', () => {
  expect(resumenCierreBultos({ total_cajas: -1, cajas_estado: [] })).toEqual({ cerrados: 0, total: 0, pendientes: 0 });
  render(<EstadoBultosArmado armado={{}} />);
  const indicador = screen.getByLabelText('Sin bultos registrados');
  expect(indicador).toHaveTextContent('0/0');
  expect(indicador.querySelector('strong')).toHaveClass('text-muted');
});
