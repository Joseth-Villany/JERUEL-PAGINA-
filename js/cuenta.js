(() => {
  'use strict';
  const tienda = window.Jeruel;
  const estados = { pendiente: 'Pendiente de pago', pagado: 'Pagado', camino: 'En camino', entregado: 'Entregado' };
  const medios = { tarjeta: 'Tarjeta', pse: 'PSE', nequi: 'Nequi' };

  function lineas(items) {
    return items.map(({ id, cantidad }) => {
      const { nombre, imagen, precio } = tienda.productos.get(id);
      return { id, nombre, imagen, precio, cantidad };
    });
  }

  const ejemplos = [
    ['JR-1044', '2026-11-18', 'pendiente', 'chocolate', 2, 'nequi'],
    ['JR-1043', '2026-11-12', 'pagado', 'frutos_rojos', 1, 'pse'],
    ['JR-1042', '2026-11-06', 'camino', 'maracuya', 2, 'tarjeta'],
    ['JR-1041', '2026-10-29', 'entregado', 'bosque', 1, 'tarjeta']
  ].map(([id, fecha, estado, producto, cantidad, medio]) => ({
    id, fecha, estado, medio, envio: 8000,
    direccion: 'Dirección de prueba · Popayán, Cauca',
    items: lineas([{ id: producto, cantidad }])
  }));

  const id = () => crypto.getRandomValues(new Uint32Array(2)).join('-');
  const hoy = () => new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Bogota'}).format(new Date());
  const fecha = valor => new Intl.DateTimeFormat('es-CO', {dateStyle: 'medium', timeZone: 'UTC'}).format(new Date(valor + 'T00:00:00Z'));
  const subtotal = pedido => pedido.items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  const total = pedido => subtotal(pedido) + pedido.envio;
  const pedidos = () => tienda.leerPerfil().pedidos ?? ejemplos;

  function guardarPerfil(cambios) {
    try {
      localStorage.setItem('jeruel_perfil', JSON.stringify({ ...tienda.leerPerfil(), ...cambios }));
      return true;
    } catch { return false; }
  }

  // El historial usa una instantánea de los productos para conservar el precio del pedido.
  function confirmarPedido(pedido, medio, estado) {
    const historial = pedidos();
    const anterior = historial.find(entrada => entrada.id === pedido.id);
    if (anterior && anterior.estado !== 'pendiente') return anterior;
    if (anterior && estado === 'pendiente' && anterior.medio === medio && anterior.pagoFecha) return anterior;
    const actualizado = { ...pedido, medio, estado, pagoFecha: hoy() };
    const nuevos = anterior
      ? historial.map(entrada => entrada.id === pedido.id ? actualizado : entrada)
      : [actualizado, ...historial];
    return guardarPerfil({ pedidos: nuevos }) ? actualizado : null;
  }

  function nuevaCompra(items, direccion) {
    return { id: 'JR-' + id(), fecha: hoy(), estado: 'pendiente', direccion, envio: 0, items: lineas(items) };
  }

  function elemento(tag, texto, clase) {
    const nodo = document.createElement(tag);
    if (texto !== undefined) nodo.textContent = texto;
    if (clase) nodo.className = clase;
    return nodo;
  }

  function fechaHTML(valor) {
    const nodo = elemento('time', fecha(valor));
    nodo.dateTime = valor;
    return nodo;
  }

  // Muestra errores en español al salir del campo y mientras se corrige.
  function validar(formulario) {
    function mostrar(campo) {
      if (!campo.willValidate || !campo.id) return;
      let mensaje = document.getElementById(campo.id + '-error');
      if (!mensaje) {
        mensaje = elemento('small', '', 'error-campo');
        mensaje.id = campo.id + '-error';
        mensaje.setAttribute('aria-live', 'polite');
        campo.after(mensaje);
        const ayuda = campo.getAttribute('aria-describedby');
        campo.setAttribute('aria-describedby', [ayuda, mensaje.id].filter(Boolean).join(' '));
      }
      const { validity } = campo;
      mensaje.textContent = validity.valid ? '' : validity.valueMissing ? 'Completa este campo.' :
        validity.typeMismatch ? 'Escribe un correo válido.' :
        campo.dataset.error || 'Revisa el formato de este campo.';
      if (validity.valid) campo.removeAttribute('aria-invalid');
      else campo.setAttribute('aria-invalid', 'true');
    }
    formulario.addEventListener('focusout', evento => {
      if (evento.target.value || evento.target.hasAttribute('aria-invalid')) mostrar(evento.target);
    });
    formulario.addEventListener('input', evento => {
      if (evento.target.hasAttribute('aria-invalid')) mostrar(evento.target);
    });
    formulario.addEventListener('invalid', evento => mostrar(evento.target), true);
    formulario.addEventListener('reset', () => {
      formulario.querySelectorAll('[aria-invalid]').forEach(campo => campo.removeAttribute('aria-invalid'));
      formulario.querySelectorAll('.error-campo').forEach(mensaje => { mensaje.textContent = ''; });
    });
  }

  Object.assign(tienda, { estados, medios, pedidos, guardarPerfil, confirmarPedido, nuevaCompra, total, subtotal, fechaHTML, elemento, validar, id });
})();
