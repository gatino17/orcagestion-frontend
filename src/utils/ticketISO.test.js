import { agruparEstadoTicketISO, calcularIndicadorTrimestralTicketISO, clasificarIndicadorTicketISO, crearFormularioTicketISO, fechaHoraTicketISOParaAPI, fechaHoraTicketISOParaInput, formatearFechaTicketISO, resumirTicketsISO, sugerirNumeroTicketISO } from "./ticketISO";

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
    expect(formulario).toEqual({ numero_ticket: "ISO-001", problema: "Falta actualizar",
        estado: "resuelto", fecha_recepcion: "2026-07-14", fecha_registro_descripcion: "", origen: "ticket_iso", categoria_procedimiento: "bodega",
        fecha_cierre: "", responsable: "", observaciones: "", accion_inmediata: "", responsable_accion_inmediata: "", fecha_accion_inmediata: "", causa_raiz: "", responsable_causa_raiz: "", fecha_causa_raiz: "", amerita_seguimiento: null,
        seguimiento_preguntas: Array.from({ length: 5 }, () => ({ pregunta: "", respuesta: "" })) });
    expect(formatearFechaTicketISO("2026-07-14")).toBe("14/07/2026");
    expect(crearFormularioTicketISO().numero_ticket).toBe("");
    expect(formatearFechaTicketISO(undefined)).toBe("-");
    expect(formatearFechaTicketISO(null)).toBe("-");
});

test("el formulario conserva fecha de cierre, responsable y observaciones al editar", () => {
    expect(crearFormularioTicketISO({ fecha_recepcion: "2026-10-14", estado: "resuelto", responsable_id: 3, responsable: "Responsable externo",
        observaciones: "Procedimiento actualizado", fecha_cierre: "2026-10-15T01:30:00Z" }))
        .toMatchObject({ fecha_cierre: "2026-10-14", responsable: "Responsable externo", observaciones: "Procedimiento actualizado" });
});

test("conserva las fechas de descripcion y accion por separado sin inventarlas en tickets antiguos", () => {
    const formulario = crearFormularioTicketISO({ fecha_recepcion: "2026-10-14", responsable: "Persona descripcion", fecha_registro_descripcion: "2026-10-15",
        responsable_accion_inmediata: "Persona accion", fecha_accion_inmediata: "2026-10-16" });
    expect(formulario).toMatchObject({ responsable: "Persona descripcion", fecha_registro_descripcion: "2026-10-15",
        responsable_accion_inmediata: "Persona accion", fecha_accion_inmediata: "2026-10-16" });
    expect(crearFormularioTicketISO({ responsable: "Persona descripcion" })).toMatchObject({
        fecha_registro_descripcion: "", responsable_accion_inmediata: "", fecha_accion_inmediata: "",
    });
    expect(crearFormularioTicketISO()).toMatchObject({ fecha_registro_descripcion: fechaHoraTicketISOParaInput(new Date()).slice(0, 10),
        responsable_accion_inmediata: "", fecha_accion_inmediata: "" });
});

test("prepara cinco preguntas independientes, conserva respuestas y distingue No de sin seleccionar", () => {
    const guardadas = [{ pregunta: "Causa?", respuesta: "En revision" }];
    const formulario = crearFormularioTicketISO({ amerita_seguimiento: true, seguimiento_preguntas: guardadas, accion_inmediata: "Contencion", causa_raiz: "Causa identificada", observaciones: "Resultados previos" });
    expect(formulario.accion_inmediata).toBe("Contencion");
    expect(formulario.causa_raiz).toBe("Causa identificada");
    expect(formulario.observaciones).toBe("Resultados previos");
    expect(formulario.amerita_seguimiento).toBe(true);
    expect(formulario.seguimiento_preguntas).toHaveLength(5);
    expect(formulario.seguimiento_preguntas[0]).toEqual(guardadas[0]);
    formulario.seguimiento_preguntas[0].pregunta = "Corregida";
    expect(guardadas[0].pregunta).toBe("Causa?");
    expect(formulario.seguimiento_preguntas[1].pregunta).toBe("");
    expect(crearFormularioTicketISO({ amerita_seguimiento: false }).amerita_seguimiento).toBe(false);
    expect(crearFormularioTicketISO().amerita_seguimiento).toBeNull();
    expect(crearFormularioTicketISO().seguimiento_preguntas[0].pregunta).toBe("");
});

test("carga los datos de causa raiz por separado sin copiar los de descripcion ni accion", () => {
    expect(crearFormularioTicketISO({ responsable: "Persona descripcion", responsable_accion_inmediata: "Persona accion",
        responsable_causa_raiz: "Persona analisis", fecha_causa_raiz: "2026-10-17" }))
        .toMatchObject({ responsable: "Persona descripcion", responsable_accion_inmediata: "Persona accion",
            responsable_causa_raiz: "Persona analisis", fecha_causa_raiz: "2026-10-17" });
    expect(crearFormularioTicketISO({ responsable: "No copiar" })).toMatchObject({ responsable_causa_raiz: "", fecha_causa_raiz: "" });
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

test("el indicador reproduce la formula del ejemplo sin valores inventados", () => {
    const tickets = [
        ...Array.from({ length: 8 }, () => ({ fecha_recepcion: "2026-06-20", estado: "resuelto", fecha_cierre: "2026-07-20" })),
        ...Array.from({ length: 2 }, () => ({ fecha_recepcion: "2026-07-25", estado: "resuelto", fecha_cierre: "2026-09-29" })),
        { fecha_recepcion: "2026-09-30", estado: "pendiente", fecha_cierre: "2026-10-20" },
    ];
    const indicador = calcularIndicadorTrimestralTicketISO(tickets, "2026-09", new Date("2026-10-14T12:00:00Z"));
    expect(indicador).toMatchObject({ trimestre: 3, inicio: "2026-07-01", fin: "2026-09-30", corte: "2026-09-30",
        abiertosInicio: 8, recibidos: 3, cerrados: 10, base: 11, incompletos: 0, clasificacion: "bueno", fase: "finalizado" });
    expect(indicador.porcentaje).toBeCloseTo(90.9091, 4);
});

test("el indicador respeta limites del trimestre y no considera cierres previstos", () => {
    const indicador = calcularIndicadorTrimestralTicketISO([
        { fecha_recepcion: "2026-06-01", estado: "resuelto", fecha_cierre: "2026-06-30" },
        { fecha_recepcion: "2026-06-01", estado: "resuelto", fecha_cierre: "2026-07-01" },
        { fecha_recepcion: "2026-06-02", estado: "en_seguimiento", fecha_cierre: "2026-07-05" },
        { fecha_recepcion: "2026-07-01", estado: "resuelto", fecha_cierre: "2026-09-30" },
        { fecha_recepcion: "2026-08-01", estado: "resuelto", fecha_cierre: "2026-10-01" },
        { fecha_recepcion: "2026-10-01", estado: "pendiente" },
    ], "2026-09", new Date("2026-10-14T12:00:00Z"));
    expect(indicador).toMatchObject({ abiertosInicio: 2, recibidos: 2, cerrados: 2, base: 4, porcentaje: 50, clasificacion: "malo" });
});

test("el indicador no adelanta datos futuros y distingue una medicion parcial", () => {
    const tickets = [
        { fecha_recepcion: "2026-10-01", estado: "resuelto", fecha_cierre: "2026-10-14" },
        { fecha_recepcion: "2026-10-02", estado: "resuelto", fecha_cierre: "2026-11-15" },
        { fecha_recepcion: "2026-12-01", estado: "pendiente" },
    ];
    const ahora = new Date("2026-10-14T12:00:00Z");
    expect(calcularIndicadorTrimestralTicketISO(tickets, "2026-10", ahora)).toMatchObject({ fase: "en_curso", corte: "2026-10-14", recibidos: 2, cerrados: 1, porcentaje: 50 });
    expect(calcularIndicadorTrimestralTicketISO(tickets, "2027-01", ahora)).toMatchObject({ fase: "futuro", corte: null, base: 0, porcentaje: null });
    expect(calcularIndicadorTrimestralTicketISO([], "2026-01", ahora)).toMatchObject({ porcentaje: null, clasificacion: "sin_datos" });
});

test("el indicador clasifica los limites exactos y no asigna una nota con datos incompletos", () => {
    expect(clasificarIndicadorTicketISO(74.99)).toBe("malo");
    expect(clasificarIndicadorTicketISO(75)).toBe("regular");
    expect(clasificarIndicadorTicketISO(85)).toBe("regular");
    expect(clasificarIndicadorTicketISO(85.01)).toBe("bueno");
    const indicador = calcularIndicadorTrimestralTicketISO([{ fecha_recepcion: "2026-07-01", estado: "resuelto" }], "2026-09", new Date("2026-10-14T12:00:00Z"));
    expect(indicador).toMatchObject({ porcentaje: null, incompletos: 1, clasificacion: "incompleto" });
});

test("el indicador cambia el corte y las cifras entre meses del mismo trimestre", () => {
    const tickets = [
        { fecha_recepcion: "2026-06-20", estado: "resuelto", fecha_cierre: "2026-08-20" },
        { fecha_recepcion: "2026-07-10", estado: "resuelto", fecha_cierre: "2026-07-20" },
        { fecha_recepcion: "2026-08-10", estado: "pendiente" },
    ];
    const ahora = new Date("2026-10-14T12:00:00Z");
    expect(calcularIndicadorTrimestralTicketISO(tickets, "2026-07", ahora)).toMatchObject({
        corte: "2026-07-31", abiertosInicio: 1, recibidos: 1, cerrados: 1, porcentaje: 50, fase: "en_curso",
    });
    const agosto = calcularIndicadorTrimestralTicketISO(tickets, "2026-08", ahora);
    expect(agosto).toMatchObject({ corte: "2026-08-31", abiertosInicio: 1, recibidos: 2, cerrados: 2, fase: "en_curso" });
    expect(agosto.porcentaje).toBeCloseTo(66.67, 2);
});
