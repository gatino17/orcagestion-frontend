import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "./Layout.css";

function Header({ onLogout }) {
  const [estadoConexion, setEstadoConexion] = useState("checking");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";
  const normalizeText = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  const formatNotifDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      hour12: false,
    });
  };
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/status/`)
      .then((response) => {
        if (response.data.status === "ok") {
          setEstadoConexion("connected");
        } else {
          setEstadoConexion("disconnected");
        }
      })
      .catch(() => setEstadoConexion("disconnected"));
  }, [API_BASE_URL]);

  useEffect(() => {
    const onArmadoFinalizado = (evt) => {
      const d = evt?.detail || {};
      const idArmado = Number(d?.id_armado || 0);
      if (!idArmado) return;
      const fecha = d?.fecha_evento || new Date().toISOString();
      const notif = {
        id: `armado-local-${idArmado}-${fecha}`,
        fecha,
        texto: `${d?.tecnico_name || "Tecnico"} finalizo armado en ${d?.centro_nombre || "centro"}`,
        tipo: "armado",
      };
      setNotificaciones((prev) => [notif, ...prev].slice(0, 20));
      setUnreadCount((c) => c + 1);
    };
    window.addEventListener("orcagest-notif-armado-finalizado", onArmadoFinalizado);
    return () => window.removeEventListener("orcagest-notif-armado-finalizado", onArmadoFinalizado);
  }, []);

  useEffect(() => {
    let mounted = true;
    const cursorKey = "orcagest_notif_cursor_v3";
    const armadoEstadoMapKey = "orcagest_notif_armado_estado_v1";
    const baselineKey = "orcagest_notif_baseline_done_v2";
    const rawCursor = localStorage.getItem(cursorKey);
    const rawArmadoEstadoMap = localStorage.getItem(armadoEstadoMapKey);
    let cursor = { armadoFinalizadoId: 0, mantencionId: 0, actividadAsignadaId: 0 };
    let armadoEstadoMap = {};
    try {
      if (rawCursor) cursor = { ...cursor, ...JSON.parse(rawCursor) };
    } catch (_) {}
    try {
      if (rawArmadoEstadoMap) armadoEstadoMap = JSON.parse(rawArmadoEstadoMap) || {};
    } catch (_) {}

    const pollEventos = async () => {
      try {
        const [armadosRes, mantRes, actividadesRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/armados`),
          axios.get(`${API_BASE_URL}/mantenciones_terreno/`),
          axios.get(`${API_BASE_URL}/actividades/`),
        ]);
        const armados = armadosRes.status === "fulfilled" && Array.isArray(armadosRes.value?.data)
          ? armadosRes.value.data
          : [];
        const mantenciones = mantRes.status === "fulfilled" && Array.isArray(mantRes.value?.data)
          ? mantRes.value.data
          : [];
        const actividadesList = actividadesRes?.status === "fulfilled" && Array.isArray(actividadesRes.value?.data)
          ? actividadesRes.value.data
          : [];

        const token = localStorage.getItem("token");
        let nombreUsuario = "";
        try {
          if (token) {
            const decoded = jwtDecode(token);
            nombreUsuario = normalizeText(decoded?.name || decoded?.nombre || decoded?.username || "");
          }
        } catch (_) {
          nombreUsuario = "";
        }

        const isAreaInstalacion = (value) => {
          const area = normalizeText(value);
          return area.startsWith("instal") || area.startsWith("reap");
        };
        const nombrePrincipal = (a) => normalizeText(a?.encargado_principal?.nombre_encargado || "");
        const nombreAyudante = (a) => normalizeText(a?.encargado_ayudante?.nombre_encargado || "");
        const coincideUsuario = (a) => {
          if (!nombreUsuario) return false;
          const p = nombrePrincipal(a);
          const y = nombreAyudante(a);
          return (
            (p && (p.includes(nombreUsuario) || nombreUsuario.includes(p))) ||
            (y && (y.includes(nombreUsuario) || nombreUsuario.includes(y)))
          );
        };

        const actividadesAsignadas = actividadesList.filter(
          (a) =>
            isAreaInstalacion(a?.area) &&
            String(a?.estado || "").toLowerCase() !== "finalizado" &&
            String(a?.estado || "").toLowerCase() !== "cancelado" &&
            coincideUsuario(a)
        );

        const armadosFinalizados = armados.filter((a) => String(a?.estado || "").toLowerCase() === "finalizado");
        const estadoMapActual = {};
        armados.forEach((a) => {
          const id = Number(a?.id_armado || 0);
          if (!id) return;
          estadoMapActual[id] = String(a?.estado || "").toLowerCase();
        });
        const maxArmado = armadosFinalizados.reduce(
          (max, a) => Math.max(max, Number(a?.id_armado || 0)),
          cursor.armadoFinalizadoId || 0
        );
        const maxMant = mantenciones.reduce(
          (max, m) => Math.max(max, Number(m?.id_mantencion_terreno || 0)),
          cursor.mantencionId || 0
        );
        const maxActividad = actividadesAsignadas.reduce(
          (max, a) => Math.max(max, Number(a?.id_actividad || 0)),
          cursor.actividadAsignadaId || 0
        );

        const baselineDone = localStorage.getItem(baselineKey) === "1";
        if (!baselineDone) {
          armadoEstadoMap = estadoMapActual;
          localStorage.setItem(armadoEstadoMapKey, JSON.stringify(armadoEstadoMap));
          cursor = { armadoFinalizadoId: maxArmado, mantencionId: maxMant, actividadAsignadaId: maxActividad };
          localStorage.setItem(cursorKey, JSON.stringify(cursor));
          localStorage.setItem(baselineKey, "1");
          return;
        }

        const nuevas = [];
        armadosFinalizados.forEach((a) => {
          const id = Number(a?.id_armado || 0);
          if (!id) return;
          const estadoAnterior = String(armadoEstadoMap[id] || "").toLowerCase();
          if (estadoAnterior === "finalizado") return;
            nuevas.push({
              id: `armado-${a.id_armado}`,
              fecha: new Date().toISOString(),
              texto: `${a?.tecnico_name || "Tecnico"} finalizo armado en ${a?.centro?.nombre || a?.centro_nombre || "centro"}`,
              tipo: "armado",
            });
          });

        mantenciones
          .filter((m) => Number(m?.id_mantencion_terreno || 0) > (cursor.mantencionId || 0))
          .forEach((m) => {
            nuevas.push({
              id: `mant-${m.id_mantencion_terreno}`,
              fecha: new Date().toISOString(),
              texto: `Nueva mantencion en ${m?.centro || "centro"}${m?.tecnico_1 ? ` (${m.tecnico_1})` : ""}`,
              tipo: "mantencion",
            });
          });

        actividadesAsignadas
          .filter((a) => Number(a?.id_actividad || 0) > (cursor.actividadAsignadaId || 0))
          .forEach((a) => {
            const tipo = normalizeText(a?.area).startsWith("reap") ? "reapuntamiento" : "instalacion";
            nuevas.push({
              id: `act-${a.id_actividad}`,
              fecha: new Date().toISOString(),
              texto: `Tienes asignado ${tipo} en ${a?.centro?.nombre || "centro"}`,
              tipo: "actividad",
            });
          });

        if (!mounted || !nuevas.length) {
          cursor = { armadoFinalizadoId: maxArmado, mantencionId: maxMant, actividadAsignadaId: maxActividad };
          localStorage.setItem(cursorKey, JSON.stringify(cursor));
          localStorage.setItem(armadoEstadoMapKey, JSON.stringify(estadoMapActual));
          return;
        }

        nuevas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        setNotificaciones((prev) => [...nuevas, ...prev].slice(0, 20));
        setUnreadCount((c) => c + nuevas.length);

        cursor = { armadoFinalizadoId: maxArmado, mantencionId: maxMant, actividadAsignadaId: maxActividad };
        localStorage.setItem(cursorKey, JSON.stringify(cursor));
        localStorage.setItem(armadoEstadoMapKey, JSON.stringify(estadoMapActual));
      } catch (_error) {
        // silencioso
      }
    };

    pollEventos();
    const t = setInterval(pollEventos, 30000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [API_BASE_URL]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    onLogout();
    navigate("/login");
  };

  const estadoTexto =
    estadoConexion === "connected"
      ? "Conectado"
      : estadoConexion === "checking"
      ? "Verificando"
      : "Desconectado";

  const handleToggleNav = () => {
    window.dispatchEvent(new Event("orcagest-toggle-sidenav"));
  };

  const handleToggleNotificaciones = () => {
    setNotifOpen((v) => !v);
    setUnreadCount(0);
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="header-icon-button"
          data-widget="pushmenu"
          onClick={handleToggleNav}
          title="Mostrar/ocultar menu"
        >
          <i className="fas fa-bars" />
        </button>
        <div className="header-brand">
          <i className="fas fa-satellite-dish" />
          <div>
            <span>OrcaGest</span>
            <small>Panel Operativo</small>
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className={`status-pill ${estadoConexion}`}>{estadoTexto}</div>
        <div className="header-notif-wrap">
          <button
            className={`header-icon-button ${unreadCount > 0 ? "notif-alert" : ""}`}
            title="Notificaciones"
            onClick={handleToggleNotificaciones}
          >
            <i className="fas fa-bell" />
            {unreadCount > 0 ? <span className="notif-dot">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
          </button>
          {notifOpen ? (
            <div className="notif-dropdown">
              <div className="notif-title">Alertas recientes</div>
              {notificaciones.length === 0 ? (
                <div className="notif-empty">Sin alertas nuevas.</div>
              ) : (
                <div className="notif-list">
                  {notificaciones.map((n) => (
                    <div key={n.id} className={`notif-item ${n.tipo}`}>
                      <div className="notif-text">{n.texto}</div>
                      <small className="notif-date">{formatNotifDate(n.fecha)}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
        <button
          className="header-icon-button"
          data-widget="fullscreen"
          title="Pantalla completa"
        >
          <i className="fas fa-expand-arrows-alt" />
        </button>
        <button className="header-icon-button logout" onClick={handleLogout} title="Salir">
          <i className="fas fa-sign-out-alt" />
        </button>
      </div>
    </header>
  );
}

export default Header;
