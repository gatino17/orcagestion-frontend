import { API_BASE_URL } from '../api';

// El historial puede incluir rutas relativas o enlaces antiguos al localhost del backend.
export const resolverDocumentoCentro = (documento) => {
  if (!documento) return null;
  const ruta = String(documento).match(/^(?:https?:\/\/[^/]+)?\/api\/(filtro\/documento\/[A-Za-z_]+\/\d+|inventarios\/\d+\/documento)$/);
  return ruta ? `${(API_BASE_URL || '/api').replace(/\/$/, '')}/${ruta[1]}` : documento;
};
