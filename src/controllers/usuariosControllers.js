// Función para simular la obtención de usuarios (debería venir de un API o base de datos)
export const obtenerUsuarios = (setUsuarios) => {
    // Simulación de usuarios (esto se puede cambiar por una llamada real a la API)
    const usuariosFicticios = [
      { id: 1, nombre: 'Juan Pérez', correo: 'juan.perez@example.com', rol: 'Admin' },
      { id: 2, nombre: 'Ana Gómez', correo: 'ana.gomez@example.com', rol: 'Usuario' },
      { id: 3, nombre: 'Carlos López', correo: 'carlos.lopez@example.com', rol: 'Técnico' },
    ];
  
    // Simula un retraso de red
    setTimeout(() => {
      setUsuarios(usuariosFicticios);
    }, 1000);
  };
  