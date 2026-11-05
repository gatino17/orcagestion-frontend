import { agruparResponsabilidadFalla, normalizarResponsabilidadFalla } from "./soporteResponsabilidad";

test.each([undefined, null, "", "  ", "otro", 1, {}, []])("responsabilidad antigua o desconocida %j queda por determinar", (valor) => {
    expect(normalizarResponsabilidadFalla(valor)).toBe("por_determinar");
});

test("agrupa por responsabilidad y no por origen del reporte, sin perder ni duplicar casos", () => {
    const soportes = [
        { id_soporte: 1, responsabilidad_falla: " Cliente ", origen: "orca" },
        { id_soporte: 2, responsabilidad_falla: "orca", origen: "cliente" },
        { id_soporte: 3, responsabilidad_falla: "terceros" },
        { id_soporte: 4, origen: "cliente" },
        { id_soporte: 5, responsabilidad_falla: null },
    ];
    const grupos = agruparResponsabilidadFalla(soportes);
    expect(grupos.cliente).toEqual([soportes[0]]);
    expect(grupos.orca).toEqual([soportes[1]]);
    expect(grupos.terceros).toEqual([soportes[2]]);
    expect(grupos.por_determinar).toEqual(soportes.slice(3));
    expect(Object.values(grupos).flat()).toHaveLength(soportes.length);
});

test("un periodo vacio conserva las cuatro categorias con cero casos", () => {
    expect(agruparResponsabilidadFalla([])).toEqual({ cliente: [], orca: [], terceros: [], por_determinar: [] });
});
