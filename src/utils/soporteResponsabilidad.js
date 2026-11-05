export const RESPONSABILIDADES_FALLA = [
    { key: "cliente", label: "Cliente" },
    { key: "orca", label: "Orca" },
    { key: "terceros", label: "Terceros" },
    { key: "por_determinar", label: "Por determinar" },
];

export function normalizarResponsabilidadFalla(valor) {
    const key = typeof valor === "string" ? valor.trim().toLowerCase() : "";
    return RESPONSABILIDADES_FALLA.some((item) => item.key === key) ? key : "por_determinar";
}

export function agruparResponsabilidadFalla(soportes) {
    const grupos = Object.fromEntries(RESPONSABILIDADES_FALLA.map(({ key }) => [key, []]));
    soportes.forEach((soporte) => grupos[normalizarResponsabilidadFalla(soporte.responsabilidad_falla)].push(soporte));
    return grupos;
}
