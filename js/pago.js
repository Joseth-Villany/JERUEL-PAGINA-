(() => {
  'use strict';

  const tienda = window.Jeruel;
  const buscar = id => document.getElementById(id);
  const consulta = new URLSearchParams(location.search);
  if (consulta.get('vista') === 'cuenta' && !consulta.has('pedido')) {
    buscar('titulo-compra').textContent = 'Métodos de pago';
    buscar('vista-cuenta').hidden = false;
    return;
  }

  const idPedido = consulta.get('pedido');
  const esHistorial = idPedido !== null;
  const pedidoGuardado = () => tienda.pedidos().find(entrada => entrada.id === idPedido);
  let pedido = pedidoGuardado();
  let etapa = 'entrega';
  let procesando = false;
  let push = 0;
  let carritoRevisado = '';
  const indicadores = [...document.querySelectorAll('[data-paso]')];
  const entrega = buscar('formulario-entrega');
  const pago = buscar('formulario-pago');
  const estado = buscar('estado-pago');
  const confirmar = buscar('simular-pago');
  const ayudas = {
    tarjeta: 'Selecciona una tarjeta ficticia. Los campos muestran datos de prueba.',
    pse: 'Selecciona un banco de prueba para simular el paso bancario.',
    nequi: 'Simula el envío y la aprobación de una notificación en este navegador.'
  };

  document.title = 'Finalizar compra | JERUEL';
  buscar('vista-compra').hidden = false;
  if (esHistorial) {
    buscar('volver-compra').href = 'perfil.html#pedidos';
    buscar('volver-compra').textContent = 'Volver a mis pedidos';
    if (!pedido || pedido.estado !== 'pendiente') {
      buscar('titulo-vacio').textContent = pedido ? 'Este pedido ya fue procesado' : 'Pedido no encontrado';
      buscar('texto-vacio-pago').textContent = 'Consulta el historial para elegir un pedido pendiente.';
      const enlace = buscar('carrito-vacio-pago').querySelector('a');
      enlace.href = 'perfil.html#pedidos';
      enlace.textContent = 'Ver historial';
      buscar('carrito-vacio-pago').hidden = false;
      return;
    }
    buscar('titulo-compra').textContent = 'Pagar pedido ' + pedido.id;
    buscar('ayuda-direccion').hidden = true;
  }

  function mostrarPaso(paso, enfocar = true) {
    etapa = paso;
    for (const indicador of indicadores) {
      const actual = indicador.dataset.paso === paso;
      buscar('paso-' + indicador.dataset.paso).hidden = !actual;
      if (actual) indicador.setAttribute('aria-current', 'step');
      else indicador.removeAttribute('aria-current');
    }
    buscar('resumen-pago').hidden = paso === 'confirmacion';
    confirmar.hidden = paso !== 'pago';
    if (enfocar) buscar('paso-' + paso).querySelector('h2').focus();
  }

  function pintarEntrega() {
    const direcciones = tienda.leerPerfil().direcciones ?? [];
    const opciones = esHistorial ? [{ texto: pedido.direccion, principal: true }] : [
      ...direcciones.filter(item => item?.direccion && item.ciudad).map(item => ({
        texto: [item.direccion, item.barrio, item.ciudad, item.departamento].filter(Boolean).join(', '),
        principal: Boolean(item.principal)
      })),
      { texto: 'Dirección de demostración' }
    ];
    const seleccion = opciones.find(item => item.principal) ?? opciones[0];
    for (const [indice, opcion] of opciones.entries()) {
      const fila = tienda.elemento('li');
      const etiqueta = tienda.elemento('label');
      const radio = Object.assign(tienda.elemento('input'), {
        type: 'radio', name: 'direccion', value: String(indice), checked: opcion === seleccion
      });
      radio.dataset.texto = opcion.texto;
      etiqueta.append(radio, opcion.texto);
      fila.append(etiqueta);
      buscar('opciones-entrega').append(fila);
    }
  }

  function renderizarResumen() {
    const tienePedido = Boolean(pedido?.items.length);
    buscar('flujo-compra').hidden = !tienePedido;
    buscar('carrito-vacio-pago').hidden = tienePedido;
    if (!tienePedido) return;
    const lista = buscar('articulos-pago');
    lista.replaceChildren();
    for (const item of pedido.items) {
      const fila = tienda.elemento('li');
      const imagen = Object.assign(tienda.elemento('img'), { src: item.imagen, alt: '', width: 52, height: 52 });
      fila.append(imagen, tienda.elemento('span', item.cantidad + ' × ' + item.nombre),
        tienda.elemento('strong', tienda.precio(item.precio * item.cantidad)));
      lista.append(fila);
    }
    buscar('subtotal-pago').textContent = tienda.precio(tienda.subtotal(pedido));
    buscar('envio-pago').textContent = tienda.precio(pedido.envio);
    buscar('total-pago').textContent = tienda.precio(tienda.total(pedido));
  }

  function actualizarCarrito(direccion) {
    const items = tienda.carrito();
    const huella = JSON.stringify(items);
    const cambio = carritoRevisado !== huella;
    if (cambio || !pedido) pedido = tienda.nuevaCompra(items, direccion);
    pedido.direccion = direccion;
    carritoRevisado = huella;
    renderizarResumen();
    return cambio;
  }

  entrega.addEventListener('submit', evento => {
    evento.preventDefault();
    const direccion = entrega.querySelector('input:checked');
    if (!direccion) return;
    if (!esHistorial) actualizarCarrito(direccion.dataset.texto);
    buscar('entrega-seleccionada').textContent = pedido.direccion;
    estado.textContent = '';
    if (pedido.items.length) mostrarPaso('pago');
    else buscar('titulo-vacio').focus();
  });

  function seleccionarMedio() {
    const metodo = pago.elements.metodo.value;
    buscar('ayuda-metodo').textContent = ayudas[metodo];
    for (const valor of Object.keys(ayudas)) {
      const campos = buscar('campos-' + valor);
      campos.hidden = campos.disabled = valor !== metodo;
    }
  }
  for (const radio of pago.elements.metodo) radio.addEventListener('change', seleccionarMedio);
  buscar('volver-entrega').addEventListener('click', () => {
    if (procesando) return;
    estado.textContent = '';
    mostrarPaso('entrega');
  });
  const tarjeta = buscar('tarjeta-demo');
  function mostrarTarjeta() {
    const numero = tarjeta.value;
    buscar('numero-demo').value = numero.match(/.{1,4}/g).join(' ');
    buscar('franquicia-demo').textContent = numero.startsWith('4') ? 'Franquicia detectada: Visa' : 'Franquicia detectada: Mastercard';
  }
  tarjeta.addEventListener('change', mostrarTarjeta);
  buscar('push-demo').addEventListener('click', evento => {
    if (procesando) return;
    if (push === 2) push = 0;
    else push++;
    evento.currentTarget.textContent = ['Simular notificación', 'Aprobar notificación de prueba', 'Reiniciar notificación'][push];
    buscar('estado-push').textContent = ['', 'Notificación ficticia enviada. Apruébala aquí.', 'Notificación de prueba aprobada.'][push];
  });

  // Punto de integración. En producción, el backend crea el intento y verifica
  // el resultado de la pasarela. Aquí solo se devuelve el escenario elegido.
  function processPayment(resultadoDePrueba) {
    return new Promise(resolve => setTimeout(() => resolve(resultadoDePrueba), 650));
  }

  function finalizar(resultado) {
    buscar('titulo-confirmacion').textContent = resultado.estado === 'pagado' ? 'Pago de prueba aprobado' : 'Pago de prueba pendiente';
    buscar('detalle-confirmacion').textContent = resultado.id + ' · ' + tienda.medios[resultado.medio] + ' · ' + tienda.precio(tienda.total(resultado));
    buscar('mensaje-confirmacion').textContent = resultado.estado === 'pagado'
      ? 'El estado se actualizó en Mis pedidos.'
      : 'Puedes consultar el pedido o volver a intentar el pago desde el historial.';
    estado.textContent = '';
    mostrarPaso('confirmacion');
  }

  pago.addEventListener('submit', async evento => {
    evento.preventDefault();
    if (etapa !== 'pago' || procesando) return;
    const metodo = pago.elements.metodo.value;
    const escenario = buscar('resultado-demo').value;
    if (metodo === 'nequi' && (!push || escenario === 'pagado' && push !== 2)) {
      buscar('estado-push').textContent = 'Completa la simulación de notificación para continuar.';
      buscar('push-demo').focus();
      return;
    }

    if (!esHistorial && actualizarCarrito(pedido.direccion)) {
      estado.textContent = 'El carrito cambió. Revisa el nuevo total antes de continuar.';
      (pedido.items.length ? estado : buscar('titulo-vacio')).focus();
      return;
    }
    if (esHistorial && !pedidoGuardado()) {
      estado.textContent = 'El pedido ya no está disponible en el historial.';
      estado.focus();
      return;
    }

    procesando = true;
    confirmar.disabled = true;
    pago.setAttribute('aria-busy', 'true');
    estado.textContent = 'Procesando pago de prueba…';
    const resultado = await processPayment(escenario);
    confirmar.disabled = false;
    pago.removeAttribute('aria-busy');
    procesando = false;

    if (resultado === 'rechazado') {
      estado.textContent = 'Pago de prueba rechazado. Puedes cambiar el resultado o el método e intentarlo de nuevo.';
      estado.focus();
      return;
    }
    if (esHistorial && !pedidoGuardado()) {
      estado.textContent = 'El pedido ya no está disponible en el historial.';
      estado.focus();
      return;
    }
    if (!esHistorial && actualizarCarrito(pedido.direccion)) {
      estado.textContent = 'El carrito cambió mientras se procesaba la simulación. Revisa el nuevo total.';
      (pedido.items.length ? estado : buscar('titulo-vacio')).focus();
      return;
    }
    const guardado = tienda.confirmarPedido(pedido, metodo, resultado);
    if (!guardado) {
      estado.textContent = 'No se pudo guardar el pedido en este navegador. Puedes volver a intentarlo.';
      estado.focus();
      return;
    }
    finalizar(guardado);
  });

  estado.tabIndex = -1;
  const predeterminado = tienda.leerPerfil().mediosPago?.find(medio => medio.principal);
  const medioInicial = esHistorial ? pedido.medio : predeterminado?.tipo;
  const radioInicial = [...pago.elements.metodo].find(radio => radio.value === medioInicial);
  if (radioInicial) radioInicial.checked = true;
  if (predeterminado?.referencia.endsWith('4444')) tarjeta.selectedIndex = 1;
  tienda.validar(pago);
  mostrarTarjeta();
  seleccionarMedio();
  pintarEntrega();
  if (esHistorial) renderizarResumen();
  else actualizarCarrito('Dirección de demostración');
})();
