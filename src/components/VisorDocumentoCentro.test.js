import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import VisorDocumentoCentro from './VisorDocumentoCentro';
import { obtenerDocumentoCentro } from '../api';

jest.mock('../api', () => ({ API_BASE_URL: 'https://orca.example/api', obtenerDocumentoCentro: jest.fn() }));
const documento = { titulo: 'Plano del sistema', url: 'http://localhost:5000/api/filtro/documento/Levantamientos/26' };
const pdf = () => new Blob(['%PDF-1.4'], { type: 'application/pdf' });
beforeEach(() => {
  jest.clearAllMocks();
  obtenerDocumentoCentro.mockReset();
  obtenerDocumentoCentro.mockResolvedValue(pdf());
  URL.createObjectURL = jest.fn(() => 'blob:visor');
  URL.revokeObjectURL = jest.fn();
});

test('muestra el PDF en un modal con descarga sin abrir otra ventana', async () => {
  const cerrar = jest.fn();
  const abrir = jest.spyOn(window, 'open').mockImplementation(() => null);
  try {
    render(<VisorDocumentoCentro documento={documento} onClose={cerrar} />);
    expect(screen.getByRole('dialog', { name: documento.titulo })).toHaveAttribute('aria-modal', 'true');
    expect(await screen.findByTitle('Vista previa de Plano del sistema')).toHaveAttribute('src', 'blob:visor');
    const descargar = screen.getByRole('link', { name: 'Descargar' });
    expect(descargar).toHaveAttribute('download', 'Plano del sistema.pdf');
    expect(descargar).not.toHaveAttribute('target');
    expect(obtenerDocumentoCentro).toHaveBeenCalledWith('https://orca.example/api/filtro/documento/Levantamientos/26');
    expect(abrir).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar vista previa' }));
    expect(cerrar).toHaveBeenCalledTimes(1);
  } finally { abrir.mockRestore(); }
});

test('muestra imagenes sin iframe y conserva su extension al descargar', async () => {
  obtenerDocumentoCentro.mockResolvedValue(new Blob(['imagen'], { type: 'image/png' }));
  render(<VisorDocumentoCentro documento={documento} onClose={jest.fn()} />);
  expect(await screen.findByRole('img', { name: documento.titulo })).toHaveAttribute('src', 'blob:visor');
  expect(screen.getByRole('link', { name: 'Descargar' })).toHaveAttribute('download', 'Plano del sistema.png');
  expect(screen.queryByTitle(/Vista previa de/)).not.toBeInTheDocument();
});

test('carga respaldos privados mediante su lector autenticado', async () => {
  const cargar = jest.fn().mockResolvedValue(pdf());
  render(<VisorDocumentoCentro documento={{ titulo: 'Respaldo privado', cargar }} onClose={jest.fn()} />);
  await screen.findByTitle('Vista previa de Respaldo privado');
  expect(cargar).toHaveBeenCalledTimes(1);
  expect(obtenerDocumentoCentro).not.toHaveBeenCalled();
});

test('informa errores del servidor y permite reintentar', async () => {
  obtenerDocumentoCentro.mockRejectedValueOnce({ response: { data: { error: 'El archivo no existe' } } });
  render(<VisorDocumentoCentro documento={documento} onClose={jest.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('El archivo no existe');
  expect(screen.queryByRole('link', { name: 'Descargar' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByTitle('Vista previa de Plano del sistema');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('no interpreta una pagina HTML de error como un documento', async () => {
  obtenerDocumentoCentro.mockResolvedValue(new Blob(['<html>Error proxy</html>'], { type: 'text/html' }));
  render(<VisorDocumentoCentro documento={documento} onClose={jest.fn()} />);
  await screen.findByRole('alert');
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test('los formatos sin visor ofrecen descarga en lugar de navegar fuera de la pagina', async () => {
  obtenerDocumentoCentro.mockResolvedValue(new Blob(['presentacion'], { type: 'application/vnd.ms-powerpoint' }));
  render(<VisorDocumentoCentro documento={documento} onClose={jest.fn()} />);
  await screen.findByText(/Este formato no tiene vista previa/);
  expect(screen.getByRole('link', { name: 'Descargar' })).toHaveAttribute('href', 'blob:visor');
  expect(screen.queryByTitle(/Vista previa de/)).not.toBeInTheDocument();
});

test('libera el archivo y restablece el foco y el desplazamiento al cerrar', async () => {
  const boton = document.createElement('button');
  document.body.appendChild(boton);
  boton.focus();
  const overflow = document.body.style.overflow;
  const cerrar = jest.fn();
  const vista = render(<VisorDocumentoCentro documento={documento} onClose={cerrar} />);
  await screen.findByTitle('Vista previa de Plano del sistema');
  expect(document.body.style.overflow).toBe('hidden');
  expect(screen.getByRole('button', { name: 'Cerrar vista previa' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(cerrar).toHaveBeenCalledTimes(1);
  vista.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:visor');
  expect(document.body.style.overflow).toBe(overflow);
  expect(boton).toHaveFocus();
  boton.remove();
});

test('una respuesta tardia no crea un archivo despues de cerrar', async () => {
  let completar;
  obtenerDocumentoCentro.mockReturnValue(new Promise((resolve) => { completar = resolve; }));
  const vista = render(<VisorDocumentoCentro documento={documento} onClose={jest.fn()} />);
  vista.unmount();
  await act(async () => completar(pdf()));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test('al cambiar de documento libera el anterior y muestra solo el nuevo', async () => {
  const vista = render(<VisorDocumentoCentro documento={documento} onClose={jest.fn()} />);
  await screen.findByTitle('Vista previa de Plano del sistema');
  vista.rerender(<VisorDocumentoCentro documento={{ titulo: 'Otro documento', url: '/otro.pdf' }} onClose={jest.fn()} />);
  await waitFor(() => expect(obtenerDocumentoCentro).toHaveBeenCalledWith('/otro.pdf'));
  expect(await screen.findByTitle('Vista previa de Otro documento')).toHaveAttribute('src', 'blob:visor');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:visor');
});
