import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ConsultaCentro from './ConsultaCentro';
import { obtenerClientes, obtenerCentrosPorCliente, obtenerHistorialCentro } from '../controllers/consultaCentroControllers';
import { obtenerActasEntrega, obtenerPermisosTrabajo } from '../api';

jest.mock('../controllers/consultaCentroControllers', () => ({
  obtenerClientes: jest.fn(), obtenerCentrosPorCliente: jest.fn(), obtenerHistorialCentro: jest.fn(), obtenerHistorialCentroPDF: jest.fn(),
}));
jest.mock('../api', () => ({ API_BASE_URL: 'https://orca.example:24306/api', obtenerActasEntrega: jest.fn(), obtenerPermisosTrabajo: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  obtenerClientes.mockImplementation((ok) => ok([{ id_cliente: 1, nombre: 'Cliente' }]));
  obtenerCentrosPorCliente.mockImplementation((id, ok) => ok([{ id_centro: 21, nombre: 'Centro prueba' }]));
  obtenerActasEntrega.mockResolvedValue([]);
  obtenerPermisosTrabajo.mockResolvedValue([]);
});
const abrir = async (historial = {}, inventario = []) => {
  obtenerHistorialCentro.mockImplementation((id, ok) => ok({ centro: { id_centro: 21, nombre: 'Centro prueba' }, historial, inventario, equipos_ip: [] }));
  render(<ConsultaCentro />);
  fireEvent.change(screen.getByLabelText('Seleccionar cliente'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Seleccionar centro'), { target: { value: '21' } });
  await screen.findByText('Sin actas del sistema registradas.');
};

test.each(['http://localhost:5000', ''])(
  'abre levantamientos con la API del servidor aunque el historial use %s', async (base) => {
    await abrir({ levantamientos: [{ id_levantamiento: 26, fecha_levantamiento: '2026-11-26', documento: `${base}/api/filtro/documento/Levantamientos/26` }] });
    const enlace = screen.getByRole('link', { name: 'Ver documento' });
    expect(enlace).toHaveAttribute('href', 'https://orca.example:24306/api/filtro/documento/Levantamientos/26');
    expect(enlace).toHaveAttribute('target', '_blank');
  }
);

test.each([['traslados', 'Traslados', 'id_traslado'], ['ceses', 'Ceses', 'id_cese'], ['retiros', 'Retiros', 'id_retiro']])(
  'corrige tambien los enlaces antiguos de %s', async (seccion, tipo, campoId) => {
    await abrir({ [seccion]: [{ [campoId]: 26, documento: `http://localhost:5000/api/filtro/documento/${tipo}/26` }] });
    expect(screen.getByRole('link', { name: 'Ver documento' })).toHaveAttribute('href', `https://orca.example:24306/api/filtro/documento/${tipo}/26`);
  }
);

test('el boton de inventario tampoco abre localhost', async () => {
  const ventana = jest.spyOn(window, 'open').mockImplementation(() => null);
  try {
    await abrir({}, [{ id_inventario: 8, documento: 'http://localhost:5000/api/inventarios/8/documento' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Ver inventario' }));
    expect(ventana).toHaveBeenCalledWith('https://orca.example:24306/api/inventarios/8/documento', '_blank');
  } finally { ventana.mockRestore(); }
});
