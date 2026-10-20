import React from "react";

export default function EstadoRegistroEquipoArmado({ equipo, onChange, cajaPendiente = "Pendiente de caja" }) {
    const estado = ["no_aplica", "pendiente"].includes(equipo.estado_registro) ? equipo.estado_registro : "normal";
    const cambiarEstado = (event) => {
        const siguiente = event.target.value;
        onChange({
            estado_registro: siguiente,
            observacion_registro: siguiente === "pendiente" ? equipo.observacion_registro || "" : "",
            ...(siguiente === "no_aplica" ? { numero_serie: "", codigo: "", caja: cajaPendiente } : {}),
            ...(siguiente === "pendiente" ? { caja: cajaPendiente } : {}),
        });
    };
    return <div className="mb-2" style={{ minWidth: 160 }}>
        <small className="text-muted">Estado de registro</small>
        <select className="form-control form-control-sm" aria-label={`Estado de registro de ${equipo.nombre}`}
            value={estado} onChange={cambiarEstado}>
            <option value="normal">Habilitado (Normal)</option>
            <option value="no_aplica">No aplica</option>
            <option value="pendiente">Pendiente</option>
        </select>
        {estado === "pendiente" && <textarea className="form-control form-control-sm mt-1"
            aria-label={`Observacion pendiente de ${equipo.nombre}`} rows={2} required
            placeholder="Motivo por el que queda pendiente"
            value={equipo.observacion_registro || ""}
            onChange={(event) => onChange({ observacion_registro: event.target.value })} />}
    </div>;
}
