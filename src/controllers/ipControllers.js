// Controlador para obtener las IPs desde una fuente de datos simulada
export const obtenerIps = async () => {
    // Simulación de datos de IPs
    const ipsSimuladas = [
      {
        cliente: "Cliente 1",
        centro: "Centro 1",
        foto: null,  // Podrías agregar una imagen aquí
      },
      {
        cliente: "Cliente 2",
        centro: "Centro 2",
        foto: null,
      },
    ];
  
    // Simular llamada a una API o base de datos
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(ipsSimuladas);
      }, 1000);
    });
  };
  