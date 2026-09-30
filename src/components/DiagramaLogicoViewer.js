import React, { useMemo } from "react";
import "./DiagramaLogicoViewer.css";

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

const leerContenido = (valor) => {
  try {
    const contenido = typeof valor === "string" ? JSON.parse(valor || "{}") : valor || {};
    return {
      nodos: Array.isArray(contenido.nodos) ? contenido.nodos : [],
      conexiones: Array.isArray(contenido.conexiones) ? contenido.conexiones : [],
      grupos: Array.isArray(contenido.grupos) ? contenido.grupos : [],
    };
  } catch {
    return { nodos: [], conexiones: [], grupos: [] };
  }
};

const colorConOpacidad = (color, opacidad) => {
  const valor = String(color || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(valor)) return `rgba(14, 165, 233, ${opacidad})`;
  const numero = parseInt(valor, 16);
  return `rgba(${(numero >> 16) & 255}, ${(numero >> 8) & 255}, ${numero & 255}, ${opacidad})`;
};

const posicionCentrada = (elementos, conexionId, separacion = 1.15) => {
  const indice = Math.max(0, elementos.findIndex((item) => item.id === conexionId));
  return (indice - ((elementos.length - 1) / 2)) * separacion;
};

const normalizarEquipo = (valor) => String(valor || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const resolverNodoFalla = (nodos, falla) => {
  if (!falla) return "";
  const equipoId = String(falla.equipo_id || "");
  if (equipoId) {
    const exacto = nodos.find((nodo) => String(nodo.equipo_id || "") === equipoId);
    if (exacto) return exacto.id;
  }

  const referencias = [falla.equipo_nombre, falla.device_name, falla.entity_type]
    .map(normalizarEquipo)
    .filter(Boolean);
  let mejor = { id: "", puntaje: 0 };
  nodos.forEach((nodo) => {
    const candidatos = [nodo.tipo_equipo, nodo.nombre].map(normalizarEquipo).filter(Boolean);
    let puntaje = 0;
    candidatos.forEach((candidato) => {
      referencias.forEach((referencia) => {
        if (candidato === referencia) puntaje = Math.max(puntaje, 90);
        else if (candidato.length >= 5 && referencia.length >= 5 && (candidato.includes(referencia) || referencia.includes(candidato))) {
          puntaje = Math.max(puntaje, 65);
        } else {
          const tokens = referencia.split(" ").filter((token) => token.length >= 4);
          const coincidencias = tokens.filter((token) => candidato.includes(token)).length;
          if (coincidencias) puntaje = Math.max(puntaje, coincidencias * 18);
        }
      });
    });
    if (puntaje > mejor.puntaje) mejor = { id: nodo.id, puntaje };
  });
  return mejor.puntaje >= 30 ? mejor.id : "";
};

const rutaCurva = (origen, destino, conexion, conexiones, nodos) => {
  const diferenciaX = Math.abs(destino.x - origen.x);
  const diferenciaY = Math.abs(destino.y - origen.y);
  const horizontal = diferenciaX > diferenciaY * 1.15;
  const salientes = conexiones
    .filter((item) => item.origen === conexion.origen)
    .sort((a, b) => {
      const nodoA = nodos.find((item) => item.id === a.destino);
      const nodoB = nodos.find((item) => item.id === b.destino);
      return horizontal ? (nodoA?.y || 0) - (nodoB?.y || 0) : (nodoA?.x || 0) - (nodoB?.x || 0);
    });
  const entrantes = conexiones
    .filter((item) => item.destino === conexion.destino)
    .sort((a, b) => {
      const nodoA = nodos.find((item) => item.id === a.origen);
      const nodoB = nodos.find((item) => item.id === b.origen);
      return horizontal ? (nodoA?.y || 0) - (nodoB?.y || 0) : (nodoA?.x || 0) - (nodoB?.x || 0);
    });

  if (horizontal) {
    const inicioY = origen.y + posicionCentrada(salientes, conexion.id);
    const finY = destino.y + posicionCentrada(entrantes, conexion.id);
    const direccion = destino.x >= origen.x ? 1 : -1;
    const curvatura = Math.max(4, diferenciaX * 0.42);
    return `M ${origen.x} ${inicioY} C ${origen.x + (direccion * curvatura)} ${inicioY}, ${destino.x - (direccion * curvatura)} ${finY}, ${destino.x} ${finY}`;
  }

  const inicioX = origen.x + posicionCentrada(salientes, conexion.id);
  const finX = destino.x + posicionCentrada(entrantes, conexion.id);
  const direccion = destino.y >= origen.y ? 1 : -1;
  const curvatura = Math.max(5, diferenciaY * 0.42);
  return `M ${inicioX} ${origen.y} C ${inicioX} ${origen.y + (direccion * curvatura)}, ${finX} ${destino.y - (direccion * curvatura)}, ${finX} ${destino.y}`;
};

const DiagramaLogicoViewer = ({ plantilla, fallaActiva = null }) => {
  const contenido = useMemo(
    () => leerContenido(plantilla?.diagrama_logico_json),
    [plantilla?.diagrama_logico_json]
  );
  const nodoFallaId = useMemo(
    () => resolverNodoFalla(contenido.nodos, fallaActiva),
    [contenido.nodos, fallaActiva]
  );

  if (!contenido.nodos.length && !contenido.grupos.length) {
    return (
      <div className="diagram-viewer-empty">
        <i className="fas fa-project-diagram" />
        <strong>Esta plantilla aun no tiene un diagrama logico.</strong>
      </div>
    );
  }

  return (
    <div className="diagram-viewer-scroll">
      <div className="diagram-viewer-canvas">
        {contenido.grupos.map((grupo) => (
          <div
            className="diagram-viewer-group"
            key={grupo.id}
            style={{
              left: `${grupo.x}%`,
              top: `${grupo.y}%`,
              width: `${grupo.ancho}%`,
              height: `${grupo.alto}%`,
              "--diagram-color": grupo.color,
              backgroundColor: colorConOpacidad(grupo.color, grupo.opacidad),
            }}
          >
            <span>{grupo.nombre}</span>
          </div>
        ))}

        <svg className="diagram-viewer-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {contenido.conexiones.map((conexion, indice) => {
            const origen = contenido.nodos.find((item) => item.id === conexion.origen);
            const destino = contenido.nodos.find((item) => item.id === conexion.destino);
            if (!origen || !destino) return null;
            const ruta = rutaCurva(origen, destino, conexion, contenido.conexiones, contenido.nodos);
            const relacionadaConFalla = !!nodoFallaId && (conexion.origen === nodoFallaId || conexion.destino === nodoFallaId);
            const colorConexion = relacionadaConFalla ? "#ff4054" : (conexion.color || "#38d2f2");
            return (
              <g key={conexion.id} className={relacionadaConFalla ? "is-fault-connection" : ""}>
                <path className="diagram-viewer-underlay" d={ruta} vectorEffect="non-scaling-stroke" />
                <path className="diagram-viewer-line" d={ruta} stroke={colorConexion} vectorEffect="non-scaling-stroke" />
                <ellipse className="diagram-viewer-flow-point" rx="0.34" ry="0.85" fill={colorConexion}>
                  <animateMotion
                    path={ruta}
                    dur={`${2.8 + ((indice % 4) * 0.35)}s`}
                    begin={`${indice * 0.16}s`}
                    repeatCount="indefinite"
                  />
                </ellipse>
              </g>
            );
          })}
        </svg>

        {contenido.nodos.map((nodo) => (
          <div
            className={`diagram-viewer-node ${nodo.id === nodoFallaId ? "is-fault" : ""}`}
            key={nodo.id}
            style={{ left: `${nodo.x}%`, top: `${nodo.y}%`, "--diagram-color": nodo.color }}
            title={[nodo.tipo_equipo ? `Equipo: ${nodo.tipo_equipo}` : "", nodo.descripcion].filter(Boolean).join("\n") || nodo.nombre}
          >
            <i className={ICONOS[nodo.tipo] || ICONOS.otro} />
            <span>{nodo.nombre}</span>
          </div>
        ))}
        {fallaActiva && !nodoFallaId && (
          <div className="diagram-viewer-unmatched">
            <i className="fas fa-exclamation-triangle" /> No se pudo asociar esta alerta con un nodo del diagrama.
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagramaLogicoViewer;
