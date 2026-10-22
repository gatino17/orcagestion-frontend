import { extraerTipoEquipoBodega, coincideTipoEquipoBodega } from './consultaBodega';

test.each(['cuantos equipos hay en bodega', 'equipos en bodega', 'dime el total de equipos en bodega hoy'])(
  'generic question preserves the complete warehouse count: %s', (pregunta) => {
    expect(extraerTipoEquipoBodega(pregunta)).toBeNull();
  });

test.each([
  ['cuantos PC hay en bodega', 'PC cliente', 'PC'],
  ['cuantos computadores hay en bodega', 'PC', 'PC'],
  ['cuantas computadoras hay en bodega', 'Computador', 'PC'],
  ['cuantos routers hay en bodega', 'Router Mikrotik', 'routers'],
  ['cuantos switch hay en bodega', 'Switch POE', 'switches'],
  ['cuantos switches hay en bodega', 'Switch (Cisco)', 'switches'],
  ['cuantas camaras hay en bodega', 'C\u00e1mara PTZ Laser', 'camaras'],
  ['cuantos monitores hay en bodega', 'Monitor', 'monitores'],
  ['cuantos sensores hay en bodega', 'Sensor magnetico', 'sensores'],
  ['cuantos axis p8221 hay en bodega', 'Axis P8221', 'equipos de tipo axis p8221'],
  ['cuantos netio hay en bodega', 'Netio', 'equipos de tipo netio'],
  ['cuantos switch poe hay en bodega', 'Switch POE 2', 'switches poe'],
])('recognizes the requested equipment: %s', (pregunta, nombre, plural) => {
  const tipo = extraerTipoEquipoBodega(pregunta);
  expect(tipo.plural).toBe(plural);
  expect(coincideTipoEquipoBodega({ equipo_nombre: nombre }, tipo)).toBe(true);
});

test.each([
  ['cuantos PC hay en bodega', 'PCIE'],
  ['cuantos routers hay en bodega', 'Switch'],
  ['cuantos switch poe hay en bodega', 'Switch Cisco'],
  ['cuantas camaras hay en bodega', 'Tablero Camara'],
  ['cuantos axis p8221 hay en bodega', 'Axis P8222'],
])('does not include a different type: %s / %s', (pregunta, nombre) => {
  expect(coincideTipoEquipoBodega({ equipo_nombre: nombre, codigo: 'PC' }, extraerTipoEquipoBodega(pregunta))).toBe(false);
});

test('an unknown requested type is not treated as a generic stock question', () => {
  const tipo = extraerTipoEquipoBodega('cuantas impresoras hay en bodega');
  expect(tipo).not.toBeNull();
  expect(coincideTipoEquipoBodega({ equipo_nombre: 'PC' }, tipo)).toBe(false);
  expect(coincideTipoEquipoBodega({ nombre: 'Impresora' }, tipo)).toBe(true);
});
