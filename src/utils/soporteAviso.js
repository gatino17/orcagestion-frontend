export const admiteAvisoTerreno = (tipo, estado, fechaCierre) =>
    tipo === 'terreno' && ['pendiente', 'en_proceso'].includes(estado) && !fechaCierre;

export async function notificarSoporteGuardado(id, enviar) {
    try {
        const resultado = await enviar(id);
        const enviado = resultado?.aviso_terreno?.estado === 'enviado';
        return { id, enviado, reintentable: false, mensaje: enviado
            ? 'Soporte guardado. El servidor de correo acepto el aviso para soporte.'
            : 'Soporte guardado. El aviso esta en proceso; verifica su estado antes de reenviar.' };
    } catch (error) {
        const data = error?.response?.data;
        return { id, enviado: false,
            reintentable: data?.reintentable === true || data?.aviso_terreno?.estado === 'error',
            mensaje: `Soporte guardado. ${data?.aviso_terreno?.error || data?.error ||
                'No se pudo confirmar el envio. Verifica el buzon de soporte antes de reenviar.'}` };
    }
}
