import { API_BASE_URL } from '../api';

export const urlDocumentoInstalacion = (id) =>
  `${(API_BASE_URL || '/api').replace(/\/$/, '')}/filtro/documento/Instalaciones/${id}`;

// Reconoce tambien los enlaces antiguos que apuntaban al localhost del servidor.
export const resolverDocumentoInstalacion = (documento, id) => {
  if (!documento) return null;
  return /^(?:https?:\/\/[^/]+)?\/api\/filtro\/documento\/Instalaciones\/\d+$/.test(documento)
    ? urlDocumentoInstalacion(id) : documento;
};
