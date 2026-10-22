const normalizar = (valor) => String(valor || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase();

const palabrasConsulta = new Set(('cuanto cuantos cuanta cuantas hay tengo tenemos tienes tienen existe existen ' +
  'dime muestra muestrame mostrar ver listado lista quiero necesito saber ' +
  'el la los las un una unos unas de del en por para que se estan esta son ' +
  'bodega bodegas equipo equipos tipo tipos categoria categorias total cantidad unidades ' +
  'hoy actualmente registrado registrados registrada registradas').split(' '));

const tipos = [
  ['PC', 'PC', ['pc', 'pcs', 'computador', 'computadores', 'computadora', 'computadoras', 'ordenador', 'ordenadores']],
  ['router', 'routers', ['router', 'routers']],
  ['switch', 'switches', ['switch', 'switches', 'switchs']],
  ['camara', 'camaras', ['camara', 'camaras']],
  ['monitor', 'monitores', ['monitor', 'monitores']],
  ['sensor', 'sensores', ['sensor', 'sensores']],
  ['bateria', 'baterias', ['bateria', 'baterias']],
  ['fuente', 'fuentes', ['fuente', 'fuentes']],
  ['radar', 'radares', ['radar', 'radares']],
  ['rack', 'racks', ['rack', 'racks']],
  ['NVR', 'NVR', ['nvr', 'nvrs']],
  ['UPS', 'UPS', ['ups']],
];
const aliases = new Map(tipos.flatMap(([singular, , variantes]) =>
  variantes.map((variante) => [variante, normalizar(singular)])));

const tokenizar = (texto) => (normalizar(texto).match(/[a-z0-9]+/g) || [])
  .filter((palabra) => !palabrasConsulta.has(palabra))
  .map((palabra) => aliases.get(palabra) || palabra);

export const extraerTipoEquipoBodega = (consulta) => {
  const palabras = tokenizar(consulta);
  if (!palabras.length) return null;
  const tipo = tipos.find(([singular]) => normalizar(singular) === palabras[0]);
  const resto = palabras.slice(1).join(' ');
  const nombre = palabras.join(' ');
  return {
    palabras,
    singular: tipo ? [tipo[0], resto].filter(Boolean).join(' ') : `equipo de tipo ${nombre}`,
    plural: tipo ? [tipo[1], resto].filter(Boolean).join(' ') : `equipos de tipo ${nombre}`,
  };
};

export const coincideTipoEquipoBodega = (equipo, tipo) => {
  if (!tipo) return true;
  const nombre = tokenizar(equipo?.equipo_nombre || equipo?.nombre);
  // Un tipo general incluye sus variantes; uno especifico no incluye equipos de otro tipo.
  return tipo.palabras.every((palabra, indice) => {
    const actual = nombre[indice];
    return actual && (palabra === actual || palabra === `${actual}s` || palabra === `${actual}es`
      || actual === `${palabra}s` || actual === `${palabra}es`);
  });
};
