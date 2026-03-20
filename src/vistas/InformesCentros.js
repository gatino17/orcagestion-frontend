import React, { useEffect, useMemo, useState } from "react";
import { cargarCentrosClientes } from "../controllers/centrosControllers";
import {
    obtenerActasEntrega,
    crearActaEntrega,
    actualizarActaEntrega,
    eliminarActaEntrega
} from "../api";
import "./InformesCentros.css";

const SUBCATEGORIAS = [
    { value: "acta_entrega", label: "Actas de entrega" },
    { value: "intervencion", label: "Informes de intervencion" },
    { value: "mantencion", label: "Mantenciones" },
    { value: "retiro", label: "Retiros" }
];


const toInputDate = (value) => {
    if (!value) return "";
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
};

const toDisplayDate = (value) => {
    const iso = toInputDate(value);
    if (!iso) return "-";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
};

const todayLocalInputDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

function InformesCentros() {
    const [centros, setCentros] = useState([]);
    const [loadingCentros, setLoadingCentros] = useState(true);
    const [loadingActas, setLoadingActas] = useState(false);
    const [savingActa, setSavingActa] = useState(false);
    const [subcategoria, setSubcategoria] = useState("acta_entrega");
    const [mostrarEditorActa, setMostrarEditorActa] = useState(false);

    // filtros de listado actas
    const [filtroCentroId, setFiltroCentroId] = useState("");
    const [filtroCliente, setFiltroCliente] = useState("all");
    const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
    const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

    // formulario acta de entrega
    const [editandoId, setEditandoId] = useState(null);
    const [clienteIdForm, setClienteIdForm] = useState("");
    const [centroIdForm, setCentroIdForm] = useState("");
    const [fechaRegistro, setFechaRegistro] = useState("");
    const [region, setRegion] = useState("");
    const [localidad, setLocalidad] = useState("");
    const [tecnico1, setTecnico1] = useState("");
    const [firmaTecnico1, setFirmaTecnico1] = useState("");
    const [tecnico2, setTecnico2] = useState("");
    const [firmaTecnico2, setFirmaTecnico2] = useState("");
    const [recepcionaNombre, setRecepcionaNombre] = useState("");
    const [firmaRecepciona, setFirmaRecepciona] = useState("");
    const [equiposConsiderados, setEquiposConsiderados] = useState("");

    const [actasEntrega, setActasEntrega] = useState([]);

    const centrosOrdenados = useMemo(
        () => [...centros].sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""))),
        [centros]
    );

    const clientes = useMemo(() => {
        const set = new Set();
        centros.forEach((centro) => {
            if (centro?.cliente) set.add(centro.cliente);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [centros]);

    const centroSeleccionadoForm = useMemo(
        () => centros.find((c) => String(c.id || c.id_centro) === String(centroIdForm)),
        [centros, centroIdForm]
    );

    const getCentroClienteKey = (centro) => {
        if (!centro) return "";
        if (centro.cliente_id != null && centro.cliente_id !== "") return `id:${centro.cliente_id}`;
        if (centro.id_cliente != null && centro.id_cliente !== "") return `id:${centro.id_cliente}`;
        return `name:${String(centro.cliente || "").trim()}`;
    };

    const clientesForm = useMemo(() => {
        const map = new Map();
        centros.forEach((centro) => {
            const key = getCentroClienteKey(centro);
            if (!key) return;
            if (!map.has(key)) {
                map.set(key, { key, label: String(centro.cliente || "Cliente") });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [centros]);

    const centrosFormFiltrados = useMemo(() => {
        if (!clienteIdForm) return centrosOrdenados;
        return centrosOrdenados.filter((centro) => getCentroClienteKey(centro) === clienteIdForm);
    }, [centrosOrdenados, clienteIdForm]);

    const actasFiltradas = useMemo(() => {
        return actasEntrega.filter((acta) => {
            if (filtroCliente !== "all" && (acta.cliente || acta.empresa) !== filtroCliente) return false;
            return true;
        });
    }, [actasEntrega, filtroCliente]);

    const resetFormulario = () => {
        setEditandoId(null);
        setClienteIdForm("");
        setCentroIdForm("");
        setFechaRegistro("");
        setRegion("");
        setLocalidad("");
        setTecnico1("");
        setFirmaTecnico1("");
        setTecnico2("");
        setFirmaTecnico2("");
        setRecepcionaNombre("");
        setFirmaRecepciona("");
        setEquiposConsiderados("");
        setMostrarEditorActa(false);
    };

    const abrirNuevaActa = () => {
        setEditandoId(null);
        const clienteInicial = filtroCliente !== "all" ? clientesForm.find((c) => c.label === filtroCliente)?.key || "" : "";
        setClienteIdForm(clienteInicial);
        setCentroIdForm(filtroCentroId || "");
        setFechaRegistro(todayLocalInputDate());
        setRegion("");
        setLocalidad("");
        setTecnico1("");
        setFirmaTecnico1("");
        setTecnico2("");
        setFirmaTecnico2("");
        setRecepcionaNombre("");
        setFirmaRecepciona("");
        setEquiposConsiderados("");
        setMostrarEditorActa(true);
    };

    useEffect(() => {
        if (!centroIdForm) {
            setRegion("");
            setLocalidad("");
            return;
        }
        const centro = centros.find((c) => String(c.id || c.id_centro) === String(centroIdForm));
        if (!centro) return;
        const regionCentro = centro.area || centro.region || "";
        const localidadCentro = centro.ubicacion || centro.localidad || centro.direccion || "";
        setRegion(regionCentro);
        setLocalidad(localidadCentro);
        const clienteKey = getCentroClienteKey(centro);
        if (clienteKey) setClienteIdForm(clienteKey);
    }, [centroIdForm, centros]);

    useEffect(() => {
        if (!clienteIdForm || !centroIdForm) return;
        const centro = centros.find((c) => String(c.id || c.id_centro) === String(centroIdForm));
        if (!centro) {
            setCentroIdForm("");
            return;
        }
        if (getCentroClienteKey(centro) !== clienteIdForm) {
            setCentroIdForm("");
        }
    }, [clienteIdForm, centroIdForm, centros]);

    const cargarActas = async () => {
        if (subcategoria !== "acta_entrega") return;
        setLoadingActas(true);
        try {
            const data = await obtenerActasEntrega({
                centro_id: filtroCentroId || undefined,
                fecha_desde: filtroFechaDesde || undefined,
                fecha_hasta: filtroFechaHasta || undefined
            });
            setActasEntrega(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error al cargar actas de entrega:", error);
            setActasEntrega([]);
        } finally {
            setLoadingActas(false);
        }
    };

    useEffect(() => {
        const fetchCentros = async () => {
            setLoadingCentros(true);
            try {
                const data = await cargarCentrosClientes();
                setCentros(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error al cargar centros para informes:", error);
                setCentros([]);
            } finally {
                setLoadingCentros(false);
            }
        };
        fetchCentros();
    }, []);

    useEffect(() => {
        if (subcategoria === "acta_entrega") {
            cargarActas();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subcategoria, filtroCentroId, filtroFechaDesde, filtroFechaHasta]);

    const handleGuardarActa = async () => {
        if (!centroIdForm || !fechaRegistro) {
            alert("Centro y fecha de registro son obligatorios.");
            return;
        }
        const payload = {
            centro_id: Number(centroIdForm),
            fecha_registro: fechaRegistro,
            region,
            localidad,
            tecnico_1: tecnico1,
            firma_tecnico_1: firmaTecnico1,
            tecnico_2: tecnico2,
            firma_tecnico_2: firmaTecnico2,
            recepciona_nombre: recepcionaNombre,
            firma_recepciona: firmaRecepciona,
            equipos_considerados: equiposConsiderados
        };

        setSavingActa(true);
        try {
            if (editandoId) {
                await actualizarActaEntrega(editandoId, payload);
            } else {
                await crearActaEntrega(payload);
            }
            await cargarActas();
            resetFormulario();
        } catch (error) {
            console.error("Error al guardar acta:", error);
            alert("No se pudo guardar el acta de entrega.");
        } finally {
            setSavingActa(false);
        }
    };

    const handleEditarActa = (acta) => {
        setEditandoId(acta.id_acta_entrega);
        setCentroIdForm(String(acta.centro_id || ""));
        setFechaRegistro(toInputDate(acta.fecha_registro));
        setRegion(acta.region || "");
        setLocalidad(acta.localidad || "");
        setTecnico1(acta.tecnico_1 || "");
        setFirmaTecnico1(acta.firma_tecnico_1 || "");
        setTecnico2(acta.tecnico_2 || "");
        setFirmaTecnico2(acta.firma_tecnico_2 || "");
        setRecepcionaNombre(acta.recepciona_nombre || "");
        setFirmaRecepciona(acta.firma_recepciona || "");
        setEquiposConsiderados(acta.equipos_considerados || "");
        const centro = centros.find((c) => String(c.id || c.id_centro) === String(acta.centro_id || ""));
        if (centro) {
            setClienteIdForm(getCentroClienteKey(centro));
        }
        setMostrarEditorActa(true);
    };

    const handleEliminarActa = async (id) => {
        if (!window.confirm("Quieres eliminar esta acta de entrega?")) return;
        try {
            await eliminarActaEntrega(id);
            await cargarActas();
            if (editandoId === id) resetFormulario();
        } catch (error) {
            console.error("Error al eliminar acta:", error);
            alert("No se pudo eliminar el acta.");
        }
    };

    return (
        <div className="informes-centros-page container-fluid">
            <div className="card informes-centros-hero">
                <div className="informes-hero-content">
                    <span className="informes-hero-icon">
                        <i className="fas fa-chart-pie" />
                    </span>
                    <div>
                        <p className="informes-kicker">Reporteria</p>
                        <h2>Informes de centros</h2>
                        <p className="informes-subtitle">Instalacion, intervenciones, mantenciones y retiros por centro.</p>
                    </div>
                </div>
            </div>

            <div className="card informes-centros-filtros">
                <div className="card-body informes-filtros-grid">
                    <div>
                        <label>Subcategoria</label>
                        <select className="form-control" value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)}>
                            {SUBCATEGORIAS.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Cliente</label>
                        <select className="form-control" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
                            <option value="all">Todos los clientes</option>
                            {clientes.map((cliente) => (
                                <option key={cliente} value={cliente}>
                                    {cliente}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Centro</label>
                        <select className="form-control" value={filtroCentroId} onChange={(e) => setFiltroCentroId(e.target.value)}>
                            <option value="">Todos los centros</option>
                            {centrosOrdenados.map((centro) => (
                                <option key={centro.id || centro.id_centro} value={centro.id || centro.id_centro}>
                                    {centro.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Fecha desde</label>
                        <input className="form-control" type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} />
                    </div>
                    <div>
                        <label>Fecha hasta</label>
                        <input className="form-control" type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} />
                    </div>
                </div>
            </div>

            {subcategoria === "acta_entrega" ? (
                <>
                    <div className="card informes-centros-filtros mb-3">
                        <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div>
                                <h5 className="mb-1">Actas de entrega</h5>
                                <p className="text-muted mb-0">Selecciona una fila para abrir el informe y completar datos.</p>
                            </div>
                            <button className="btn btn-primary" onClick={abrirNuevaActa}>
                                <i className="fas fa-plus mr-2" />
                                Nueva acta
                            </button>
                        </div>
                    </div>

                    <div className="card informes-centros-tabla">
                        <div className="card-body">
                            {loadingCentros || loadingActas ? (
                                <div className="informes-empty">Cargando informacion...</div>
                            ) : !actasFiltradas.length ? (
                                <div className="informes-empty">No hay actas de entrega para los filtros seleccionados.</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-sm table-hover informes-table mb-0">
                                        <thead>
                                            <tr>
                                                <th>N</th>
                                                <th>Empresa</th>
                                                <th>Region</th>
                                                <th>Localidad</th>
                                                <th>Centro</th>
                                                <th>Codigo Ponton</th>
                                                <th>Fecha registro</th>
                                                <th>Tecnico 1</th>
                                                <th>Tecnico 2</th>
                                                <th>Recepciona</th>
                                                <th>Equipos considerados</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {actasFiltradas.map((acta, index) => (
                                                <tr key={acta.id_acta_entrega}>
                                                    <td>{index + 1}</td>
                                                    <td>{acta.empresa || "-"}</td>
                                                    <td>{acta.region || "-"}</td>
                                                    <td>{acta.localidad || "-"}</td>
                                                    <td>{acta.centro || "-"}</td>
                                                    <td>{acta.codigo_ponton || "-"}</td>
                                                    <td>{toDisplayDate(acta.fecha_registro)}</td>
                                                    <td>{acta.tecnico_1 || "-"}</td>
                                                    <td>{acta.tecnico_2 || "-"}</td>
                                                    <td>{acta.recepciona_nombre || "-"}</td>
                                                    <td className="equipos-col">{acta.equipos_considerados || "-"}</td>
                                                    <td>
                                                        <button className="btn btn-sm btn-outline-primary mr-2" onClick={() => handleEditarActa(acta)}>
                                                            <i className="fas fa-folder-open mr-1" />
                                                            Abrir
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleEliminarActa(acta.id_acta_entrega)}>
                                                            <i className="fas fa-trash-alt" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {mostrarEditorActa ? (
                        <div className="informes-editor-overlay">
                            <div className="card informes-editor-card">
                                <div className="card-header d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0">{editandoId ? "Editar acta de entrega" : "Nueva acta de entrega"}</h5>
                                    <button className="btn btn-sm btn-outline-secondary" onClick={resetFormulario}>
                                        <i className="fas fa-times" />
                                    </button>
                                </div>
                                <div className="card-body informes-filtros-grid">
                                    <div>
                                        <label>Cliente</label>
                                        <select className="form-control" value={clienteIdForm} onChange={(e) => setClienteIdForm(e.target.value)}>
                                            <option value="">Seleccionar cliente</option>
                                            {clientesForm.map((cliente) => (
                                                <option key={cliente.key} value={cliente.key}>
                                                    {cliente.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Centro (acta)</label>
                                        <select className="form-control" value={centroIdForm} onChange={(e) => setCentroIdForm(e.target.value)}>
                                            <option value="">Seleccionar centro</option>
                                            {centrosFormFiltrados.map((centro) => (
                                                <option key={centro.id || centro.id_centro} value={centro.id || centro.id_centro}>
                                                    {centro.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Empresa (cliente)</label>
                                        <input className="form-control" value={centroSeleccionadoForm?.cliente || ""} disabled />
                                    </div>
                                    <div>
                                        <label>Centro</label>
                                        <input className="form-control" value={centroSeleccionadoForm?.nombre || ""} disabled />
                                    </div>
                                    <div>
                                        <label>Codigo ponton</label>
                                        <input className="form-control" value={centroSeleccionadoForm?.nombre_ponton || ""} disabled />
                                    </div>
                                    <div>
                                        <label>Fecha de registro</label>
                                        <input className="form-control" type="date" value={fechaRegistro} onChange={(e) => setFechaRegistro(e.target.value)} />
                                    </div>
                                    <div>
                                        <label>Region</label>
                                        <input className="form-control" value={region} disabled />
                                    </div>
                                    <div>
                                        <label>Localidad</label>
                                        <input className="form-control" value={localidad} disabled />
                                    </div>
                                    <div>
                                        <label>Tecnico 1</label>
                                        <input className="form-control" value={tecnico1} onChange={(e) => setTecnico1(e.target.value)} />
                                    </div>
                                    <div>
                                        <label>Firma tecnico 1</label>
                                        <input className="form-control" value={firmaTecnico1} onChange={(e) => setFirmaTecnico1(e.target.value)} />
                                    </div>
                                    <div>
                                        <label>Tecnico 2</label>
                                        <input className="form-control" value={tecnico2} onChange={(e) => setTecnico2(e.target.value)} />
                                    </div>
                                    <div>
                                        <label>Firma tecnico 2</label>
                                        <input className="form-control" value={firmaTecnico2} onChange={(e) => setFirmaTecnico2(e.target.value)} />
                                    </div>
                                    <div>
                                        <label>Recepciona sistema</label>
                                        <input className="form-control" value={recepcionaNombre} onChange={(e) => setRecepcionaNombre(e.target.value)} />
                                    </div>
                                    <div>
                                        <label>Firma recepciona</label>
                                        <input className="form-control" value={firmaRecepciona} onChange={(e) => setFirmaRecepciona(e.target.value)} />
                                    </div>
                                    <div className="informes-col-span-2">
                                        <label>Equipos considerados</label>
                                        <textarea
                                            className="form-control"
                                            rows={3}
                                            value={equiposConsiderados}
                                            onChange={(e) => setEquiposConsiderados(e.target.value)}
                                            placeholder="Listado de equipos considerados en el sistema"
                                        />
                                    </div>
                                    <div className="informes-col-span-2 d-flex gap-2 align-items-end">
                                        <button className="btn btn-primary" onClick={handleGuardarActa} disabled={savingActa}>
                                            {savingActa ? "Guardando..." : editandoId ? "Actualizar acta" : "Guardar acta"}
                                        </button>
                                        <button className="btn btn-outline-secondary" onClick={resetFormulario}>
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </>
            ) : (
                <div className="card informes-centros-tabla">
                    <div className="card-body">
                        <div className="informes-empty">
                            Esta subcategoria aun no esta implementada. Continuamos con {SUBCATEGORIAS.find((s) => s.value === subcategoria)?.label}.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InformesCentros;
