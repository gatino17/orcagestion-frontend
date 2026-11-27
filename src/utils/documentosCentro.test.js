import { resolverDocumentoCentro } from './documentosCentro';

jest.mock('../api', () => ({ API_BASE_URL: 'https://orca.example:24306/api/' }));

test.each(['Levantamientos', 'Instalaciones', 'Mantenciones', 'Traslados', 'Ceses', 'Retiros'])(
  'resuelve rutas nuevas y antiguas de %s con la API configurada', (tipo) => {
    for (const base of ['', 'http://localhost:5000', 'http://127.0.0.1:5000', 'http://servidor-anterior:24306']) {
      expect(resolverDocumentoCentro(`${base}/api/filtro/documento/${tipo}/26`))
        .toBe(`https://orca.example:24306/api/filtro/documento/${tipo}/26`);
    }
  }
);

test('resuelve tambien el documento de inventario', () => {
  expect(resolverDocumentoCentro('http://localhost:5000/api/inventarios/8/documento'))
    .toBe('https://orca.example:24306/api/inventarios/8/documento');
});

test.each([null, undefined, ''])('conserva la ausencia de documento: %s', (valor) => {
  expect(resolverDocumentoCentro(valor)).toBeNull();
});

test.each(['/documentos/plano.pdf', 'https://archivos.example/plano.pdf', 'https://archivos.example/plano.pdf?firma=abc'])(
  'no modifica archivos directos ni enlaces externos: %s', (valor) => {
    expect(resolverDocumentoCentro(valor)).toBe(valor);
  }
);
