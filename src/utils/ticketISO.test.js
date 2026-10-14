import { agruparEstadoTicketISO, crearFormularioTicketISO, fechaHoraTicketISOParaAPI, fechaHoraTicketISOParaInput, formatearFechaTicketISO, resumirTicketsISO, sugerirNumeroTicketISO } from "./ticketISO";

test("interpreta fechas de Chile en verano e invierno y conserva la hora al editar", () => {
    expect(fechaHoraTicketISOParaAPI("2026-01-14T09:30")).toBe("2026-01-14T12:30:00.000Z");
    expect(fechaHoraTicketISOParaAPI("2026-07-14T09:30")).toBe("2026-07-14T13:30:00.000Z");
    expect(fechaHoraTicketISOParaInput("2026-10-15T01:30:00Z")).toBe("2026-10-14T22:30");
    expect(fechaHoraTicketISOParaInput(fechaHoraTicketISOParaAPI("2026-07-14T23:45"))).toBe("2026-07-14T23:45");
});

test("rechaza fechas invalidas y horas inexistentes durante el cambio de horario", () => {
    expect(() => fechaHoraTicketISOParaAPI("")).toThrow();
    expect(() => fechaHoraTicketISOParaAPI("2026-02-30T09:30")).toThrow();
    expect(() => fechaHoraTicketISOParaAPI("2026-09-06T00:30")).toThrow();
});

test("el formulario conserva solo los campos del ingreso simplificado y la fecha sin hora", () => {
    const formulario = crearFormularioTicketISO({ numero_ticket: "ISO-001", asunto_procedimiento: "Revision del procedimiento",
        problema: "Falta actualizar", estado: "resuelto", fecha_recepcion: "2026-07-14", origen: "ticket_iso", categoria_procedimiento: "bodega" });
    expect(formulario).toEqual({ numero_ticket: "ISO-001", asunto_procedimiento: "Revision del procedimiento", problema: "Falta actualizar",
        estado: "resuelto", fecha_recepcion: "2026-07-14", origen: "ticket_iso", categoria_procedimiento: "bodega",
        fecha_cierre: "", responsable_id: "", observaciones: "" });
    expect(formatearFechaTicketISO("2026-07-14")).toBe("14/07/2026");
    expect(crearFormularioTicketISO().numero_ticket).toBe("");
    expect(formatearFechaTicketISO(undefined)).toBe("-");
    expect(formatearFechaTicketISO(null)).toBe("-");
});

test("el formulario conserva fecha de cierre, responsable y observaciones al editar", () => {
    expect(crearFormularioTicketISO({ fecha_recepcion: "2026-10-14", estado: "resuelto", responsable_id: 3,
        observaciones: "Procedimiento actualizado", fecha_cierre: "2026-10-15T01:30:00Z" }))
        .toMatchObject({ fecha_cierre: "2026-10-14", responsable_id: "3", observaciones: "Procedimiento actualizado" });
});

test("sugiere un valor ISO real aunque el backend no entregue el proximo numero", () => {
    const fecha = new Date("2026-10-14T12:00:00Z");
    expect(sugerirNumeroTicketISO([], undefined, fecha)).toBe("ISO-2026-001");
    expect(sugerirNumeroTicketISO([{ numero_ticket: "ISO-2026-009" }], undefined, fecha)).toBe("ISO-2026-010");
    expect(sugerirNumeroTicketISO([], "12", fecha)).toBe("ISO-2026-012");
    expect(sugerirNumeroTicketISO([], "ISO-2026-025", fecha)).toBe("ISO-2026-025");
});

test("el resumen anual cruza los estados actuales por mes de recepcion", () => {
    const resumen = resumirTicketsISO([
        { fecha_recepcion: "2026-01-15", estado: "pendiente" },
        { fecha_recepcion: "2026-01-16", estado: "en_transito" },
        { fecha_recepcion: "2026-01-17", estado: "en_seguimiento" },
        { fecha_recepcion: "2026-01-18", estado: "resuelto", fecha_cierre: "2026-02-01T12:00:00Z" },
        { fecha_recepcion: "2026-02-05", estado: "cerrado" },
        { fecha_recepcion: "2025-01-05", estado: "pendiente" },
    ], "2026");
    expect(resumen.meses).toHaveLength(12);
    expect(resumen.meses[0]).toEqual({ mes: "2026-01", total: 4, pendiente: 1, seguimiento: 2, resuelto: 1, sin_estado: 0 });
    expect(resumen.meses[1]).toMatchObject({ total: 1, resuelto: 1 });
    expect(resumen.meses[2].total).toBe(0);
    expect(resumen.totales).toEqual({ total: 5, pendiente: 1, seguimiento: 2, resuelto: 2, sin_estado: 0 });
    resumen.meses.forEach((mes) => expect(mes.total).toBe(mes.pendiente + mes.seguimiento + mes.resuelto + mes.sin_estado));
});

test("el resumen respeta el dia de Chile y no cuenta fechas invalidas como hoy", () => {
    const resumen = resumirTicketsISO([
        { fecha_recepcion: "2026-02-01T01:00:00Z", estado: "pendiente" },
        { fecha_recepcion: "2026-02-30", estado: "pendiente" },
        { fecha_recepcion: "invalida", estado: "resuelto" },
        { estado: "pendiente" },
    ], "2026");
    expect(resumen.meses[0].total).toBe(1);
    expect(resumen.meses[1].total).toBe(0);
    expect(resumen.sinFecha).toBe(3);
});

test("los estados equivalentes se agrupan y los desconocidos no se ocultan del total", () => {
    expect(agruparEstadoTicketISO("En transito")).toBe("seguimiento");
    expect(agruparEstadoTicketISO("con seguimiento")).toBe("seguimiento");
    expect(agruparEstadoTicketISO(" CERRADA ")).toBe("resuelto");
    expect(agruparEstadoTicketISO("resuelta")).toBe("resuelto");
    expect(resumirTicketsISO([{ fecha_recepcion: "2026-01-01", estado: "otro" }], "2026").totales).toMatchObject({ total: 1, sin_estado: 1 });
    expect(resumirTicketsISO([], "2026").totales.total).toBe(0);
});
