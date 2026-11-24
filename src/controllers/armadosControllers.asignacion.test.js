import { agregarArmado } from './armadosControllers';
import { crearArmado } from '../api';

jest.mock('../api', () => ({ crearArmado: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

test('conserva la respuesta del correo y los callbacks existentes al asignar', async () => {
  const response = { id_armado: 10, aviso_correo: { estado: 'enviado' } };
  crearArmado.mockResolvedValue(response);
  const callback = jest.fn();
  expect(await agregarArmado({ tecnico_id: 2 }, callback)).toEqual(response);
  expect(callback).toHaveBeenCalledWith(response);
});

test('un fallo al crear no llama al callback ni simula un guardado exitoso', async () => {
  const error = new Error('Sin conexion');
  crearArmado.mockRejectedValue(error);
  const callback = jest.fn();
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(await agregarArmado({}, callback)).toEqual({ success: false, error });
    expect(callback).not.toHaveBeenCalled();
  } finally { log.mockRestore(); }
});
