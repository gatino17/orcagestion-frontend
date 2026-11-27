import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ModalObservacionArmado from './ModalObservacionArmado';
import { guardarObservacionArmado, obtenerImagenObservacionArmado, obtenerObservacionArmado } from '../api';

jest.mock('../api', () => ({ guardarObservacionArmado: jest.fn(), obtenerImagenObservacionArmado: jest.fn(), obtenerObservacionArmado: jest.fn() }));
const original = { id_armado: 8, observacion: 'Texto original', imagenes: [] };
const imagen = { id_imagen: 21, posicion: 1, nombre: 'guardada.jpg' };
const file = (name = 'foto.jpg') => new File(['imagen de prueba'], name, { type: 'image/jpeg' });

test('acepta PDF junto a una imagen y conserva el titulo en el formulario', async () => {
  const { onSaved } = await abrir();
  const pdf = new File(['%PDF-1.4'], 'Plano.pdf', { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText('Archivo 1 (opcional)'), { target: { files: [pdf] } });
  fireEvent.change(screen.getByLabelText('Titulo de archivo 1'), { target: { value: 'Plano del sistema' } });
  expect(await screen.findByRole('link', { name: 'Ver PDF 1' })).toHaveAttribute('target', '_blank');
  expect(screen.queryByAltText('Imagen 1 de la observacion')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar observacion' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  const form = guardarObservacionArmado.mock.calls[0][1];
  expect(form.get('imagen_1').name).toBe('Plano.pdf');
  expect(form.get('titulo_1')).toBe('Plano del sistema');
});

test('reabre un PDF guardado sin intentar mostrarlo como imagen', async () => {
  obtenerObservacionArmado.mockResolvedValue({ ...original, imagenes: [{ ...imagen, nombre: 'Plano', tipo: 'pdf' }] });
  obtenerImagenObservacionArmado.mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  await abrir();
  expect(await screen.findByRole('link', { name: 'Ver PDF 1' })).toHaveAttribute('href', 'blob:imagen-prueba');
  expect(screen.queryByAltText('Imagen 1 de la observacion')).not.toBeInTheDocument();
});
beforeEach(() => {
  jest.clearAllMocks();
  obtenerObservacionArmado.mockResolvedValue(original);
  obtenerImagenObservacionArmado.mockResolvedValue(new Blob(['imagen'], { type: 'image/jpeg' }));
  guardarObservacionArmado.mockResolvedValue({ ...original, observacion: 'Nueva observacion' });
  URL.createObjectURL = jest.fn(() => 'blob:imagen-prueba');
  URL.revokeObjectURL = jest.fn();
});
const abrir = async () => {
  const onSaved = jest.fn();
  const onClose = jest.fn();
  const vista = render(<ModalObservacionArmado armadoId={8} centro="Centro de prueba" onSaved={onSaved} onClose={onClose} />);
  await waitFor(() => expect(screen.getByLabelText('Texto de observacion')).toHaveValue('Texto original'));
  return { onSaved, onClose, vista };
};

test('guarda el texto y hasta dos imagenes en la misma solicitud', async () => {
  const { onSaved } = await abrir();
  expect(screen.getByLabelText('0 de 2 archivos adjuntos')).toHaveTextContent('0/2');
  fireEvent.change(screen.getByLabelText('Texto de observacion'), { target: { value: 'Nueva observacion' } });
  const primera = file(), segunda = file('segunda.png');
  fireEvent.change(screen.getByLabelText('Archivo 1 (opcional)'), { target: { files: [primera] } });
  fireEvent.change(screen.getByLabelText('Archivo 2 (opcional)'), { target: { files: [segunda] } });
  fireEvent.change(screen.getByLabelText('Titulo de archivo 1'), { target: { value: 'Plano del sistema' } });
  fireEvent.change(screen.getByLabelText('Titulo de archivo 2'), { target: { value: 'Interior del rack' } });
  expect(await screen.findByAltText('Imagen 1 de la observacion')).toBeInTheDocument();
  expect(screen.getByLabelText('2 de 2 archivos adjuntos')).toHaveTextContent('2/2');
  expect(screen.getByLabelText('Ver imagen 2 ampliada')).toHaveAttribute('target', '_blank');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar observacion' })); });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  const [id, form] = guardarObservacionArmado.mock.calls[0];
  expect(id).toBe(8);
  expect(form.get('observacion')).toBe('Nueva observacion');
  expect(form.get('imagen_1').name).toBe('foto.jpg');
  expect(form.get('imagen_2').name).toBe('segunda.png');
  expect(form.get('titulo_1')).toBe('Plano del sistema');
  expect(form.get('titulo_2')).toBe('Interior del rack');
  expect(screen.getAllByLabelText(/Archivo [12] \(opcional\)/)).toHaveLength(2);
});

test('reabre mostrando las imagenes persistidas y guardar solo texto no las borra', async () => {
  obtenerObservacionArmado.mockResolvedValue({ ...original, imagenes: [imagen] });
  await abrir();
  await screen.findByAltText('Imagen 1 de la observacion');
  expect(obtenerImagenObservacionArmado).toHaveBeenCalledWith(8, 21);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar observacion' })); });
  await waitFor(() => expect(guardarObservacionArmado).toHaveBeenCalled());
  const form = guardarObservacionArmado.mock.calls[0][1];
  expect([...form.keys()]).toEqual(['observacion', 'titulo_1']);
  expect(form.get('titulo_1')).toBe('guardada.jpg');
});

test('quitar una imagen requiere guardar y se puede deshacer antes', async () => {
  obtenerObservacionArmado.mockResolvedValue({ ...original, imagenes: [imagen] });
  await abrir();
  await screen.findByAltText('Imagen 1 de la observacion');
  fireEvent.click(screen.getByRole('button', { name: 'Quitar archivo 1' }));
  expect(screen.getByText('Se quitara al guardar')).toBeInTheDocument();
  expect(guardarObservacionArmado).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Conservar archivo 1' }));
  await screen.findByAltText('Imagen 1 de la observacion');
  fireEvent.click(screen.getByRole('button', { name: 'Quitar archivo 1' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar observacion' })); });
  await waitFor(() => expect(guardarObservacionArmado).toHaveBeenCalled());
  expect(guardarObservacionArmado.mock.calls[0][1].get('eliminar_1')).toBe('true');
});

test('un error de guardado conserva texto y archivos para reintentar', async () => {
  guardarObservacionArmado.mockRejectedValueOnce({ response: { data: { message: 'No se pudo guardar.' } } });
  const { onSaved, onClose } = await abrir();
  fireEvent.change(screen.getByLabelText('Texto de observacion'), { target: { value: 'No perder este texto' } });
  fireEvent.change(screen.getByLabelText('Archivo 1 (opcional)'), { target: { files: [file()] } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar observacion' })); });
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar.');
  expect(screen.getByLabelText('Texto de observacion')).toHaveValue('No perder este texto');
  expect(screen.getByAltText('Imagen 1 de la observacion')).toBeInTheDocument();
  expect(onSaved).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar observacion' })); });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(guardarObservacionArmado.mock.calls[1][1].get('imagen_1').name).toBe('foto.jpg');
});

test('rechaza formatos y pesos invalidos sin agregarlos al formulario', async () => {
  await abrir();
  fireEvent.change(screen.getByLabelText('Archivo 1 (opcional)'), { target: { files: [file('documento.svg')] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('hasta 5 MB');
  const grande = file();
  Object.defineProperty(grande, 'size', { value: 6 * 1024 * 1024 });
  fireEvent.change(screen.getByLabelText('Archivo 2 (opcional)'), { target: { files: [grande] } });
  expect(screen.queryByAltText('Imagen 2 de la observacion')).not.toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar observacion' })); });
  await waitFor(() => expect(guardarObservacionArmado).toHaveBeenCalled());
  expect([...guardarObservacionArmado.mock.calls[0][1].keys()]).toEqual(['observacion']);
});

test('fallo de carga bloquea guardar hasta una recuperacion exitosa', async () => {
  obtenerObservacionArmado.mockRejectedValueOnce(new Error('Sin red'));
  render(<ModalObservacionArmado armadoId={8} onClose={jest.fn()} onSaved={jest.fn()} />);
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Guardar observacion' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar carga' }));
  await waitFor(() => expect(screen.getByLabelText('Texto de observacion')).toHaveValue('Texto original'));
  expect(screen.getByRole('button', { name: 'Guardar observacion' })).toBeEnabled();
});

test('evita duplicar guardados y cerrar durante el envio de imagenes', async () => {
  let resolver;
  guardarObservacionArmado.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
  await abrir();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar observacion' })); });
  expect(screen.getByRole('button', { name: 'Cerrar observacion' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Guardando...' }));
  expect(guardarObservacionArmado).toHaveBeenCalledTimes(1);
  await act(async () => resolver(original));
});

test('cancelar descarta los cambios y libera las vistas previas sin guardar', async () => {
  const { onClose, vista } = await abrir();
  fireEvent.change(screen.getByLabelText('Archivo 1 (opcional)'), { target: { files: [file()] } });
  await screen.findByAltText('Imagen 1 de la observacion');
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar', exact: true }));
  expect(onClose).toHaveBeenCalled();
  vista.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:imagen-prueba');
  expect(guardarObservacionArmado).not.toHaveBeenCalled();
});

test('los recuadros compactos abren el selector sin mostrar el control nativo', async () => {
  await abrir();
  const input = screen.getByLabelText('Archivo 1 (opcional)');
  expect(input).toHaveClass('armado-adjunto__input');
  expect(input).toHaveAttribute('tabindex', '-1');
  const picker = jest.spyOn(input, 'click').mockImplementation(() => {});
  fireEvent.click(screen.getByRole('button', { name: 'Adjuntar archivo 1' }));
  expect(picker).toHaveBeenCalledTimes(1);
  picker.mockRestore();
});

test('las acciones de reemplazar y quitar conservan nombres accesibles y actualizan el contador', async () => {
  obtenerObservacionArmado.mockResolvedValue({ ...original, imagenes: [imagen] });
  await abrir();
  await screen.findByAltText('Imagen 1 de la observacion');
  expect(screen.getByLabelText('1 de 2 archivos adjuntos')).toHaveTextContent('1/2');
  const input = screen.getByLabelText('Archivo 1 (opcional)');
  const picker = jest.spyOn(input, 'click').mockImplementation(() => {});
  fireEvent.click(screen.getByRole('button', { name: 'Reemplazar archivo 1' }));
  expect(picker).toHaveBeenCalledTimes(1);
  picker.mockRestore();
  fireEvent.click(screen.getByRole('button', { name: 'Quitar archivo 1' }));
  expect(screen.getByLabelText('0 de 2 archivos adjuntos')).toHaveTextContent('0/2');
  expect(screen.getByRole('button', { name: 'Conservar archivo 1' })).toHaveTextContent('Deshacer');
});

test('edita el titulo de una imagen guardada sin volver a adjuntar el archivo', async () => {
  obtenerObservacionArmado.mockResolvedValue({ ...original, imagenes: [{ ...imagen, nombre: 'Plano anterior' }] });
  await abrir();
  await screen.findByAltText('Imagen 1 de la observacion');
  const titulo = screen.getByLabelText('Titulo de archivo 1');
  expect(titulo).toHaveValue('Plano anterior');
  expect(titulo).toHaveAttribute('maxlength', '200');
  fireEvent.change(titulo, { target: { value: 'Plano del sistema' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar observacion' })); });
  const form = guardarObservacionArmado.mock.calls[0][1];
  expect(form.get('titulo_1')).toBe('Plano del sistema');
  expect(form.has('imagen_1')).toBe(false);
});

test('un error conserva el titulo escrito y quitar una imagen no envia su titulo', async () => {
  obtenerObservacionArmado.mockResolvedValue({ ...original, imagenes: [imagen] });
  guardarObservacionArmado.mockRejectedValueOnce(new Error('Sin red'));
  await abrir();
  await screen.findByAltText('Imagen 1 de la observacion');
  fireEvent.change(screen.getByLabelText('Titulo de archivo 1'), { target: { value: 'Plano del sistema' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar observacion' })); });
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.getByLabelText('Titulo de archivo 1')).toHaveValue('Plano del sistema');
  fireEvent.click(screen.getByRole('button', { name: 'Quitar archivo 1' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Guardar observacion' })); });
  expect(guardarObservacionArmado.mock.calls[1][1].has('titulo_1')).toBe(false);
});
