// Simulamos una base de datos local
let clientes = [
    { nombre: "Cliente 1", centros: [1, 2, 3] },
    { nombre: "Cliente 2", centros: [1, 2] },
  ];
  
  // Función para obtener los clientes
  export const handleObtenerClientes = () => {
    return clientes;
  };
  
  // Función para agregar un cliente (puedes conectar esto con el backend)
  export const handleCrearCliente = (nuevoCliente) => {
    clientes.push(nuevoCliente);
    return clientes;
  };
  
  // Otras funciones como eliminar, editar clientes, etc.
  