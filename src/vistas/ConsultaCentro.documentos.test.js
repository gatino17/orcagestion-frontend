import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ConsultaCentro from './ConsultaCentro';
import { obtenerClientes, obtenerCentrosPorCliente, obtenerHistorialCentro } from '../controllers/consultaCentroControllers';
import { obtenerActasEntrega, obtenerPermisosTrabajo, obtenerDocumentoCentro, obtenerRespaldoLevantamientoArmado } from '../api';

jest.mock('../controllers/consultaCentroControllers', () => ({
  obtenerClientes: jest.fn(), obtenerCentrosPorCliente: jest.fn(), obtenerHistorialCentro: jest.fn(), obtenerHistorialCentroPDF: jest.fn(),
}));
jest.mock('../api', () => ({ API_BASE_URL: 'https://orca.example:24306/api', obtenerActasEntrega: jest.fn(), obtenerPermisosTrabajo: jest.fn(),
  obtenerDocumentoCentro: jest.fn(), obtenerRespaldoLevantamientoArmado: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  obtenerClientes.mockImplementation((ok) => ok([{ id_cliente: 1, nombre: 'Cliente' }]));
  obtenerCentrosPorCliente.mockImplementation((id, ok) => ok([{ id_centro: 21, nombre: 'Centro prueba' }]));
  obtenerActasEntrega.mockResolvedValue([]);
  obtenerPermisosTrabajo.mockResolvedValue([]);
  obtenerDocumentoCentro.mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  obtenerRespaldoLevantamientoArmado.mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  URL.createObjectURL = jest.fn(() => 'blob:documento');
  URL.revokeObjectURL = jest.fn();
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
    expect(enlace).not.toHaveAttribute('target');
    fireEvent.click(enlace);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByTitle('Vista previa de Documento del centro')).toHaveAttribute('src', 'blob:documento');
    expect(obtenerDocumentoCentro).toHaveBeenCalledWith('https://orca.example:24306/api/filtro/documento/Levantamientos/26');
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
    expect(await screen.findByTitle('Vista previa de Inventario del centro')).toBeInTheDocument();
    expect(obtenerDocumentoCentro).toHaveBeenCalledWith('https://orca.example:24306/api/inventarios/8/documento');
    expect(ventana).not.toHaveBeenCalled();
  } finally { ventana.mockRestore(); }
});

test('el historial muestra los respaldos de armado como documentos de levantamiento', async () => {
  await abrir({ levantamientos: [{ origen: 'armado', historial_key: 'armado-respaldo-21', id_armado: 8,
    id_respaldo_armado: 21, nombre: 'Plano del sistema', fecha_levantamiento: '2026-11-27', tipo_documento: 'pdf' }] });
  expect(screen.getByText('Plano del sistema')).toBeInTheDocument();
  expect(screen.getByText('Respaldo de armado #8')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver documento' }));
  expect(await screen.findByTitle('Vista previa de Plano del sistema')).toBeInTheDocument();
  expect(obtenerRespaldoLevantamientoArmado).toHaveBeenCalledWith(21);
  expect(obtenerDocumentoCentro).not.toHaveBeenCalled();
});

test('los documentos vinculados a soportes en terreno usan el mismo visor', async () => {
  await abrir({ mantenciones: [{ es_soporte_terreno: true, id_soporte: 1239,
    documentos: [{ tipo: 'manual', id: 117, disponible: true }] }] });
  fireEvent.click(screen.getByRole('button', { name: 'Ver documento manual #117' }));
  expect(await screen.findByTitle('Vista previa de Mantencion #117')).toBeInTheDocument();
  expect(obtenerDocumentoCentro).toHaveBeenCalledWith('https://orca.example:24306/api/filtro/documento/Mantenciones/117');
});

test('cierra el visor al cambiar de centro', async () => {
  await abrir({ levantamientos: [{ id_levantamiento: 26, documento: '/api/filtro/documento/Levantamientos/26' }] });
  fireEvent.click(screen.getByRole('link', { name: 'Ver documento' }));
  await screen.findByTitle('Vista previa de Documento del centro');
  fireEvent.change(screen.getByLabelText('Seleccionar centro'), { target: { value: '' } });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:documento');
});
