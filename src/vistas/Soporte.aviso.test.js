import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Soporte from './Soporte';
import { cargarCentrosClientes } from '../controllers/centrosControllers';
import { actualizarSoporte, crearSoporte, enviarAvisoSoporteTerreno, obtenerSoportes,
    obtenerCasosIsmael, obtenerFallasDispositivos, obtenerEquipos } from '../api';

jest.mock('../api', () => ({ actualizarSoporte: jest.fn(), crearSoporte: jest.fn(),
    enviarAvisoSoporteTerreno: jest.fn(), obtenerSoportes: jest.fn(), obtenerCasosIsmael: jest.fn(),
    obtenerFallasDispositivos: jest.fn(), obtenerEquipos: jest.fn(), eliminarSoporte: jest.fn(),
    resolverPlantillaDiagrama: jest.fn(), eliminarCasoExternoSoporte: jest.fn() }));
jest.mock('../controllers/centrosControllers', () => ({ cargarCentrosClientes: jest.fn() }));
jest.mock('../components/DiagramaLogicoViewer', () => () => null);
jest.mock('../components/VistaGeneralViewer', () => () => null);
jest.mock('jwt-decode', () => ({ jwtDecode: () => ({ rol: 'admin' }) }));
jest.mock('react-data-table-component', () => {
    const React = require('react');
    return ({ data, columns }) => React.createElement('div', null, data.map((row) =>
        React.createElement('div', { key: row.id_soporte }, columns.find((col) => col.name === 'Acciones').cell(row))));
});

const soporte = { id_soporte: 11, centro: { id_centro: 1, nombre: 'Centro Prueba', cliente: 'Cliente Prueba' },
    fecha_soporte: `${new Date().getFullYear()}-01-10`, problema: 'Camara sin conexion', tipo: 'terreno',
    estado: 'pendiente', prioridad: 'media', origen: 'orca', sugerencia: 'Revisar cableado',
    solucion: 'Sin intervencion', cambio_equipo: false };
let alertMock;
beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    obtenerSoportes.mockResolvedValue([soporte]);
    obtenerCasosIsmael.mockResolvedValue([]);
    obtenerFallasDispositivos.mockResolvedValue([]);
    obtenerEquipos.mockResolvedValue([]);
    cargarCentrosClientes.mockResolvedValue([{ id: 1, nombre: 'Centro Prueba', cliente: 'Cliente Prueba', estado: 'activo' }]);
    crearSoporte.mockResolvedValue({ id_soporte: 77 });
    actualizarSoporte.mockResolvedValue({ id_soporte: 11 });
    enviarAvisoSoporteTerreno.mockResolvedValue({ aviso_terreno: { estado: 'enviado' } });
});
afterEach(() => { alertMock.mockRestore(); });

async function abrirNuevo() {
    render(<MemoryRouter><Soporte /></MemoryRouter>);
    await screen.findByTitle('Editar soporte');
    fireEvent.click(screen.getByRole('button', { name: 'Crear Soporte' }));
    fireEvent.change(screen.getByPlaceholderText(/ID - Centro/), { target: { value: '1 - Centro Prueba' } });
    fireEvent.change(screen.getByPlaceholderText('Describe la falla detectada'), { target: { value: 'Camara sin conexion' } });
    const tipo = screen.getAllByRole('combobox').find((select) => Array.from(select.options).some((option) => option.value === 'terreno'));
    fireEvent.change(tipo, { target: { value: 'terreno' } });
    fireEvent.change(screen.getByLabelText('Sugerencia para revision en terreno'), { target: { value: 'Revisar energia' } });
    return tipo;
}

test('guarda sugerencia separada de solucion y no envia por defecto', async () => {
    await abrirNuevo();
    expect(screen.getByLabelText('Enviar aviso por correo a soporte')).not.toBeChecked();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar' })); });
    await waitFor(() => expect(crearSoporte).toHaveBeenCalledWith(expect.objectContaining({ sugerencia: 'Revisar energia', solucion: '' })));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument());
    expect(enviarAvisoSoporteTerreno).not.toHaveBeenCalled();
});

test('primero guarda y luego notifica usando el ID recibido del servidor', async () => {
    await abrirNuevo();
    fireEvent.click(screen.getByLabelText('Enviar aviso por correo a soporte'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar' })); });
    await screen.findByText(/servidor de correo acepto el aviso/);
    expect(enviarAvisoSoporteTerreno).toHaveBeenCalledWith(77);
    expect(crearSoporte.mock.invocationCallOrder[0]).toBeLessThan(enviarAvisoSoporteTerreno.mock.invocationCallOrder[0]);
    expect(alertMock).not.toHaveBeenCalled();
});

test('fallar correo permite reintentar solo el envio sin duplicar el soporte', async () => {
    enviarAvisoSoporteTerreno.mockRejectedValueOnce({ response: { data: { aviso_terreno: { estado: 'error', error: 'Servidor no disponible' } } } });
    await abrirNuevo();
    fireEvent.click(screen.getByLabelText('Enviar aviso por correo a soporte'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar' })); });
    await screen.findByText(/Soporte guardado.*Servidor no disponible/);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Reintentar solo el correo' })); });
    await screen.findByText(/servidor de correo acepto el aviso/);
    expect(crearSoporte).toHaveBeenCalledTimes(1);
    expect(enviarAvisoSoporteTerreno).toHaveBeenCalledTimes(2);
    expect(enviarAvisoSoporteTerreno).toHaveBeenLastCalledWith(77);
    expect(alertMock).not.toHaveBeenCalled();
});

test('al editar carga la sugerencia y el aviso queda desmarcado aunque se envio antes', async () => {
    obtenerSoportes.mockResolvedValue([{ ...soporte, aviso_terreno: { estado: 'enviado' } }]);
    render(<MemoryRouter><Soporte /></MemoryRouter>);
    fireEvent.click(await screen.findByTitle('Editar soporte'));
    expect(screen.getByLabelText('Sugerencia para revision en terreno')).toHaveValue('Revisar cableado');
    expect(screen.getByLabelText('Enviar aviso por correo a soporte')).not.toBeChecked();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar' })); });
    await waitFor(() => expect(actualizarSoporte).toHaveBeenCalledWith(11, expect.objectContaining({ sugerencia: 'Revisar cableado' })));
    expect(enviarAvisoSoporteTerreno).not.toHaveBeenCalled();
});

test('cambiar a remoto desmarca el aviso y no lo envia', async () => {
    const tipo = await abrirNuevo();
    fireEvent.click(screen.getByLabelText('Enviar aviso por correo a soporte'));
    fireEvent.change(tipo, { target: { value: 'remoto' } });
    expect(screen.queryByLabelText('Enviar aviso por correo a soporte')).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar' })); });
    await waitFor(() => expect(crearSoporte).toHaveBeenCalled());
    expect(enviarAvisoSoporteTerreno).not.toHaveBeenCalled();
});

test('exige sugerencia si se solicita enviar el correo', async () => {
    await abrirNuevo();
    fireEvent.change(screen.getByLabelText('Sugerencia para revision en terreno'), { target: { value: ' ' } });
    fireEvent.click(screen.getByLabelText('Enviar aviso por correo a soporte'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar' })); });
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Completa el problema y la sugerencia'));
    expect(crearSoporte).not.toHaveBeenCalled();
});

test('envio sin confirmar advierte que revise el buzon y no ofrece reenvio ciego', async () => {
    enviarAvisoSoporteTerreno.mockRejectedValueOnce({ response: { data: { aviso_terreno: { estado: 'incierto', error: 'Verifica el buzon antes de reenviar.' } } } });
    await abrirNuevo();
    fireEvent.click(screen.getByLabelText('Enviar aviso por correo a soporte'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar' })); });
    await screen.findByText(/Soporte guardado.*Verifica el buzon/);
    expect(screen.queryByRole('button', { name: 'Reintentar solo el correo' })).not.toBeInTheDocument();
    expect(crearSoporte).toHaveBeenCalledTimes(1);
});
