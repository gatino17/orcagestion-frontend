import React, { useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../api";
import "./VistaGeneralViewer.css";

const ICONOS = {
  internet: "fas fa-cloud",
  camara: "fas fa-video",
  ptz: "fas fa-arrows-to-circle",
  termal: "fas fa-temperature-high",
  radar: "fas fa-broadcast-tower",
  router: "fas fa-wifi",
  switch: "fas fa-network-wired",
  computador: "fas fa-desktop",
  nvr: "fas fa-desktop",
  netio: "fas fa-plug",
  axis: "fas fa-microchip",
  victron: "fas fa-car-battery",
  sensor: "fas fa-satellite-dish",
  luminaria: "fas fa-lightbulb",
  bocina: "fas fa-bullhorn",
  transformador: "fas fa-charging-station",
  tablero: "fas fa-server",
  energia: "fas fa-bolt",
  otro: "fas fa-map-marker-alt",
};

const leerJson = (valor, defecto) => {
  try {
    return typeof valor === "string" ? JSON.parse(valor || "{}") : valor || defecto;
  } catch {
    return defecto;
  }
};

const normalizarEquipo = (valor) => String(valor || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const resolverMarcadorFalla = (marcadores, falla) => {
  if (!falla) return "";
  const equipoId = String(falla.equipo_id || "");
  if (equipoId) {
    const exacto = marcadores.find((marcador) => String(marcador.equipo_id || "") === equipoId);
    if (exacto) return exacto.id;
  }

  const referencias = [falla.equipo_nombre, falla.device_name, falla.entity_type]
    .map(normalizarEquipo)
    .filter(Boolean);
  let mejor = { id: "", puntaje: 0 };
  marcadores.forEach((marcador) => {
    const candidatos = [marcador.tipo_equipo, marcador.nombre].map(normalizarEquipo).filter(Boolean);
    let puntaje = 0;
    candidatos.forEach((candidato) => {
      referencias.forEach((referencia) => {
        if (candidato === referencia) puntaje = Math.max(puntaje, 90);
        else if (candidato.length >= 5 && referencia.length >= 5 && (candidato.includes(referencia) || referencia.includes(candidato))) {
          puntaje = Math.max(puntaje, 65);
        } else {
          const coincidencias = referencia.split(" ")
            .filter((token) => token.length >= 4 && candidato.includes(token)).length;
          if (coincidencias) puntaje = Math.max(puntaje, coincidencias * 18);
        }
      });
    });
    if (puntaje > mejor.puntaje) mejor = { id: marcador.id, puntaje };
  });
  return mejor.puntaje >= 30 ? mejor.id : "";
};

const resolverImagenUrl = (ruta) => {
  if (!ruta) return "";
  if (/^(https?:|data:|blob:)/i.test(ruta)) return ruta;
  const origenApi = String(API_BASE_URL || "").replace(/\/api\/?$/, "");
  return `${origenApi}${ruta.startsWith("/") ? ruta : `/${ruta}`}`;
};

const colorConOpacidad = (color, opacidad) => {
  const valor = String(color || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(valor)) return `rgba(14, 165, 233, ${opacidad})`;
  const numero = parseInt(valor, 16);
  return `rgba(${(numero >> 16) & 255}, ${(numero >> 8) & 255}, ${numero & 255}, ${opacidad})`;
};

const VistaGeneralViewer = ({ plantilla, fallaActiva = null }) => {
  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const arrastreRef = useRef({ activo: false, pointerId: null, x: 0, y: 0, izquierda: 0, arriba: 0 });
  const [zoom, setZoom] = useState(1);
  const [arrastrando, setArrastrando] = useState(false);
  const vista = useMemo(() => {
    const contenido = leerJson(plantilla?.vista_general_json, {});
    return {
      marcadores: Array.isArray(contenido.marcadores) ? contenido.marcadores : [],
      zonas: Array.isArray(contenido.zonas) ? contenido.zonas : [],
    };
  }, [plantilla?.vista_general_json]);
  const logico = useMemo(() => {
    const contenido = leerJson(plantilla?.diagrama_logico_json, {});
    return { conexiones: Array.isArray(contenido.conexiones) ? contenido.conexiones : [] };
  }, [plantilla?.diagrama_logico_json]);
  const marcadorFallaId = useMemo(
    () => resolverMarcadorFalla(vista.marcadores, fallaActiva),
    [vista.marcadores, fallaActiva]
  );
  const imagen = resolverImagenUrl(plantilla?.imagen_general);

  const iniciarArrastre = (event) => {
    if (event.button !== 2 || !scrollRef.current) return;
    event.preventDefault();
    const contenedor = scrollRef.current;
    arrastreRef.current = {
      activo: true,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      izquierda: contenedor.scrollLeft,
      arriba: contenedor.scrollTop,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setArrastrando(true);
  };

  const moverArrastre = (event) => {
    const arrastre = arrastreRef.current;
    if (!arrastre.activo || arrastre.pointerId !== event.pointerId || !scrollRef.current) return;
    event.preventDefault();
    scrollRef.current.scrollLeft = arrastre.izquierda - (event.clientX - arrastre.x);
    scrollRef.current.scrollTop = arrastre.arriba - (event.clientY - arrastre.y);
  };

  const terminarArrastre = (event) => {
    if (!arrastreRef.current.activo || arrastreRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    arrastreRef.current.activo = false;
    arrastreRef.current.pointerId = null;
    setArrastrando(false);
  };

  const cambiarZoom = (nuevoZoom, centrarFalla = false, restablecer = false) => {
    const zoomAjustado = Math.min(4, Math.max(1, nuevoZoom));
    const contenedorActual = scrollRef.current;
    const lienzoActual = canvasRef.current;
    const centroRelativo = contenedorActual && lienzoActual ? {
      x: (contenedorActual.scrollLeft + (contenedorActual.clientWidth / 2)) / lienzoActual.scrollWidth,
      y: (contenedorActual.scrollTop + (contenedorActual.clientHeight / 2)) / lienzoActual.scrollHeight,
    } : { x: 0.5, y: 0.5 };
    setZoom(zoomAjustado);
    window.setTimeout(() => {
      const contenedor = scrollRef.current;
      const lienzo = canvasRef.current;
      if (!contenedor || !lienzo) return;
      if (restablecer) {
        contenedor.scrollTo({ left: 0, top: 0, behavior: "smooth" });
        return;
      }
      const marcador = centrarFalla
        ? vista.marcadores.find((item) => item.id === marcadorFallaId)
        : null;
      const posicionX = marcador ? Number(marcador.x) / 100 : centroRelativo.x;
      const posicionY = marcador ? Number(marcador.y) / 100 : centroRelativo.y;
      const izquierda = posicionX * lienzo.scrollWidth - (contenedor.clientWidth / 2);
      const arriba = posicionY * lienzo.scrollHeight - (contenedor.clientHeight / 2);
      contenedor.scrollTo({ left: Math.max(0, izquierda), top: Math.max(0, arriba), behavior: "smooth" });
    }, 80);
  };

  if (!imagen) {
    return (
      <div className="general-viewer-empty">
        <i className="fas fa-ship" />
        <strong>Esta plantilla aun no tiene una vista general del ponton.</strong>
      </div>
    );
  }

  const marcadoresPorNodo = new Map();
  vista.marcadores.forEach((marcador) => {
    marcadoresPorNodo.set(String(marcador.id || "").replace(/^logico-/, ""), marcador);
  });

  return (
    <div className="general-viewer">
      <div className="general-viewer-toolbar">
        <span><i className="fas fa-info-circle" /> Plano fisico. Usa el boton derecho para desplazarte.</span>
        <div>
          <span className="general-viewer-zoom-controls" aria-label="Controles de zoom">
            <button
              type="button"
              className="zoom-button"
              onClick={() => cambiarZoom(zoom - 0.5)}
              disabled={zoom <= 1}
              title="Alejar"
            >
              <i className="fas fa-minus" />
            </button>
            <strong>{Math.round(zoom * 100)}%</strong>
            <button
              type="button"
              className="zoom-button"
              onClick={() => cambiarZoom(zoom + 0.5)}
              disabled={zoom >= 4}
              title="Acercar"
            >
              <i className="fas fa-plus" />
            </button>
          </span>
          <span className="general-viewer-zoom-shortcuts" aria-label="Accesos directos de zoom">
            <button
              type="button"
              className={zoom === 2 ? "active" : ""}
              onClick={() => cambiarZoom(2)}
            >
              200%
            </button>
            <button
              type="button"
              className={zoom === 4 ? "active" : ""}
              onClick={() => cambiarZoom(4)}
            >
              400%
            </button>
          </span>
          {zoom > 1 && (
            <button type="button" onClick={() => cambiarZoom(1, false, true)}>
              <i className="fas fa-compress" /> Ver plano completo
            </button>
          )}
          {marcadorFallaId && (
            <button type="button" className="fault" onClick={() => cambiarZoom(2.5, true)}>
              <i className="fas fa-crosshairs" /> Ir a la falla
            </button>
          )}
        </div>
      </div>
      <div
        className={`general-viewer-scroll ${arrastrando ? "is-panning" : ""}`}
        ref={scrollRef}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={iniciarArrastre}
        onPointerMove={moverArrastre}
        onPointerUp={terminarArrastre}
        onPointerCancel={terminarArrastre}
      >
      <div
        className={`general-viewer-canvas ${zoom <= 1 ? "is-overview" : "is-zoomed"}`}
        ref={canvasRef}
        style={{ width: `${zoom * 100}%` }}
      >
        <img src={imagen} alt={`Vista general de ${plantilla?.nombre || "la plantilla"}`} />
        <svg className="general-viewer-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {logico.conexiones.map((conexion) => {
            const origen = marcadoresPorNodo.get(String(conexion.origen));
            const destino = marcadoresPorNodo.get(String(conexion.destino));
            if (!origen || !destino) return null;
            const fallaRelacionada = marcadorFallaId && (origen.id === marcadorFallaId || destino.id === marcadorFallaId);
            const medioX = (Number(origen.x) + Number(destino.x)) / 2;
            const ruta = `M ${origen.x} ${origen.y} C ${medioX} ${origen.y}, ${medioX} ${destino.y}, ${destino.x} ${destino.y}`;
            return <path key={conexion.id} d={ruta} className={fallaRelacionada ? "is-fault" : ""} vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        {vista.zonas.map((zona) => (
          <div
            className="general-viewer-zone"
            key={zona.id}
            style={{
              left: `${zona.x}%`,
              top: `${zona.y}%`,
              width: `${zona.ancho}%`,
              height: `${zona.alto}%`,
              "--zone-color": zona.color,
              backgroundColor: colorConOpacidad(zona.color, zona.opacidad),
            }}
          >
            <span>{zona.nombre}</span>
          </div>
        ))}
        {vista.marcadores.map((marcador) => (
          <div
            className={`general-viewer-marker ${marcador.id === marcadorFallaId ? "is-fault" : ""}`}
            key={marcador.id}
            style={{ left: `${marcador.x}%`, top: `${marcador.y}%` }}
            title={marcador.nombre}
          >
            <i className={ICONOS[marcador.tipo] || ICONOS.otro} />
            <span>{marcador.nombre}</span>
          </div>
        ))}
        {fallaActiva && !marcadorFallaId && (
          <div className="general-viewer-unmatched">
            <i className="fas fa-exclamation-triangle" /> La alerta no esta asociada a un marcador de la vista general.
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default VistaGeneralViewer;
