import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AsistenteOperativo from './AsistenteOperativo';
import * as api from '../api';

jest.mock('../api', () => ({
  API_BASE_URL: 'http://localhost:5000/api',
  obtenerActividades: jest.fn(), obtenerArmados: jest.fn(), obtenerCentros: jest.fn(),
  obtenerEquipos: jest.fn(), obtenerGuiasSalidaArmado: jest.fn(), obtenerInventarioBodegaEquipos: jest.fn(),
  obtenerMovimientosRecientes: jest.fn(), obtenerOrdenesRevisionEquipos: jest.fn(), obtenerSoportes: jest.fn(),
  obtenerCasosIsmael: jest.fn(), obtenerFallasDispositivos: jest.fn(), resolverPlantillaDiagrama: jest.fn(),
}));
jest.mock('socket.io-client', () => ({ io: () => ({ on: jest.fn(), off: jest.fn(), disconnect: jest.fn() }) }));
jest.mock('../components/VistaGeneralViewer', () => () => null);
jest.mock('../components/DiagramaLogicoViewer', () => () => null);

const equipo = (id, estado = 'en_bodega') => ({ id_bodega_equipo: id, equipo_nombre: `Equipo ${id}`,
  codigo: `COD-${id}`, numero_serie: `SERIE-${id}`, estado_asignacion: estado, ubicacion: 'Bodega central' });

beforeEach(() => {
  localStorage.clear();
  Object.values(api).forEach((fn) => { if (jest.isMockFunction(fn)) fn.mockResolvedValue([]); });
  window.speechSynthesis = { cancel: jest.fn(), speak: jest.fn(), getVoices: jest.fn(() => []) };
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
});

afterEach(() => {
  delete window.speechSynthesis;
  delete window.SpeechSynthesisUtterance;
});

const consultarBodega = async (pregunta = 'cuantos equipos hay en bodega') => {
  render(<AsistenteOperativo />);
  await waitFor(() => expect(document.querySelector('.asistente-refresh')).not.toBeDisabled());
  const input = screen.getByPlaceholderText('Pregunta por serie, soporte, armados, bodega o actividades...');
  fireEvent.change(input, { target: { value: pregunta } });
  await act(async () => { fireEvent.submit(input.closest('form')); });
};

test('compact interface keeps a single title, a brief greeting and accessible chat controls', async () => {
  render(<AsistenteOperativo />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Actualizar datos' })).not.toBeDisabled());
  expect(screen.getAllByRole('heading', { name: 'Asistente operativo' })).toHaveLength(1);
  const saludo = document.querySelector('.asistente-message.is-intro');
  expect(saludo).toHaveTextContent('En que te puedo ayudar?');
  expect(saludo.querySelector('ul')).toBeNull();
  expect(screen.queryByText('Alcance de esta version')).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Escribe tu consulta' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Enviar consulta' })).toBeDisabled();
});

test.each([[40, 0], [3, 1]])('voice summarizes %i warehouse equipment and %i under review without reading their identifiers', async (total, enRevision) => {
  api.obtenerInventarioBodegaEquipos.mockResolvedValue([
    ...Array.from({ length: total }, (_, i) => equipo(i + 1)),
    equipo(99, 'asignado_armado'), equipo(100, 'asignado_tecnico'),
  ]);
  api.obtenerOrdenesRevisionEquipos.mockResolvedValue(enRevision ? [
    { estado: 'abierto', area: 'soporte', detalles: [{ bodega_equipo_id: 1 }] },
  ] : []);
  await consultarBodega();
  const resumen = `Hay ${total} equipos en bodega: ${total - enRevision} disponibles y ${enRevision} en revision.`;
  await screen.findByText(resumen);
  await waitFor(() => expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1));
  expect(window.speechSynthesis.speak.mock.calls[0][0].text).toBe(`${resumen} Te dejo el listado en el chat.`);
  expect(screen.getByText(/Equipo 1, codigo COD-1, serie SERIE-1:/)).toBeInTheDocument();
  expect(screen.queryByText(/codigo COD-99/)).not.toBeInTheDocument();
  expect(screen.queryByText(/codigo COD-100/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Te dejo el listado en el chat/)).not.toBeInTheDocument();
});

test('empty warehouse does not promise a nonexistent list', async () => {
  await consultarBodega();
  await screen.findByText('Actualmente no hay equipos registrados en bodega.');
  expect(window.speechSynthesis.speak.mock.calls[0][0].text).toBe('Actualmente no hay equipos registrados en bodega.');
});

test('voice disabled keeps the warehouse list in chat without speaking', async () => {
  localStorage.setItem('asistente_voz_activa', 'false');
  api.obtenerInventarioBodegaEquipos.mockResolvedValue([equipo(1)]);
  await consultarBodega();
  await screen.findByText(/Equipo 1, codigo COD-1, serie SERIE-1:/);
  expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
});

const stockMixto = () => [
  { ...equipo(1), equipo_nombre: 'PC' }, { ...equipo(2), equipo_nombre: 'PC cliente' },
  { ...equipo(3), equipo_nombre: 'Router Mikrotik' }, { ...equipo(4), equipo_nombre: 'Switch POE' },
  { ...equipo(5, 'asignado_armado'), equipo_nombre: 'PC' },
  { ...equipo(6, 'asignado_tecnico'), equipo_nombre: 'Router' },
];

test.each(['cuantos pc hay en bodega', 'cuantos computadores hay en bodega hoy'])(
  'counts and lists only PCs, including review, for: %s', async (pregunta) => {
    api.obtenerInventarioBodegaEquipos.mockResolvedValue(stockMixto());
    api.obtenerOrdenesRevisionEquipos.mockResolvedValue([
      { estado: 'abierto', detalles: [{ bodega_equipo_id: 1 }, { bodega_equipo_id: 3 }] },
    ]);
    await consultarBodega(pregunta);
    const resumen = 'Hay 2 PC en bodega: 1 disponible y 1 en revision.';
    expect(screen.getByText(resumen)).toBeInTheDocument();
    expect(window.speechSynthesis.speak.mock.calls[0][0].text).toBe(`${resumen} Te dejo el listado en el chat.`);
    expect(screen.getByText(/PC, codigo COD-1, serie SERIE-1: en revision/)).toBeInTheDocument();
    expect(screen.getByText(/PC cliente, codigo COD-2/)).toBeInTheDocument();
    expect(screen.queryByText(/codigo COD-[3456]/)).not.toBeInTheDocument();
  });

test('router plural question does not include PCs or assigned routers', async () => {
  api.obtenerInventarioBodegaEquipos.mockResolvedValue(stockMixto());
  await consultarBodega('cuantos routers hay en bodega');
  const resumen = 'Hay 1 router en bodega: 1 disponible y 0 en revision.';
  expect(screen.getByText(resumen)).toBeInTheDocument();
  expect(screen.getByText(/Router Mikrotik, codigo COD-3/)).toBeInTheDocument();
  expect(screen.queryByText(/codigo COD-[12456]/)).not.toBeInTheDocument();
  expect(window.speechSynthesis.speak.mock.calls[0][0].text).toBe(`${resumen} Te dejo el listado en el chat.`);
});

test('request for absent equipment says zero without listing the other stock', async () => {
  api.obtenerInventarioBodegaEquipos.mockResolvedValue(stockMixto());
  await consultarBodega('cuantas camaras hay en bodega');
  const mensaje = 'Actualmente no hay camaras en bodega.';
  expect(screen.getByText(mensaje)).toBeInTheDocument();
  expect(window.speechSynthesis.speak.mock.calls[0][0].text).toBe(mensaje);
  expect(screen.queryByText(/codigo COD-/)).not.toBeInTheDocument();
});

test('a specific switch query filters other equipment types', async () => {
  api.obtenerInventarioBodegaEquipos.mockResolvedValue([
    ...stockMixto(), { ...equipo(7), equipo_nombre: 'Switch Cisco' },
  ]);
  await consultarBodega('cuantos switches poe hay en bodega');
  expect(screen.getByText('Hay 1 switch poe en bodega: 1 disponible y 0 en revision.')).toBeInTheDocument();
  expect(screen.getByText(/Switch POE, codigo COD-4/)).toBeInTheDocument();
  expect(screen.queryByText(/codigo COD-7/)).not.toBeInTheDocument();
});

test.each(['actividad', 'actividades'])('warehouse activity questions still use the calendar: %s', async (palabra) => {
  await consultarBodega(`dime la ${palabra} de hoy en bodega`);
  expect(screen.getByText('Actividades de hoy')).toBeInTheDocument();
});

test('radar support equipment is not confused with support cases', async () => {
  api.obtenerInventarioBodegaEquipos.mockResolvedValue([
    ...stockMixto(), { ...equipo(7), equipo_nombre: 'Soporte radar 1' },
  ]);
  await consultarBodega('cuantos soportes de radar hay en bodega');
  expect(screen.getByText(/Hay 1 equipo de tipo soportes radar en bodega/)).toBeInTheDocument();
  expect(screen.getByText(/Soporte radar 1, codigo COD-7/)).toBeInTheDocument();
  expect(screen.queryByText(/codigo COD-[123456]/)).not.toBeInTheDocument();
});
