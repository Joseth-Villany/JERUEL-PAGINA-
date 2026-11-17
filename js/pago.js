(() => {
  'use strict';

  const tienda = window.Jeruel;
  const buscar = id => document.getElementById(id);
  if (new URLSearchParams(location.search).get('vista') === 'cuenta') {
    buscar('vista-cuenta').hidden = false;
    return;
  }

  document.title = 'Finalizar compra | JERUEL';
  buscar('vista-compra').hidden = false;

  const pasos = [...document.querySelectorAll('[data-paso]')];
  const formularioEntrega = buscar('formulario-entrega');
  const formularioPago = buscar('formulario-pago');
  const estado = buscar('estado-pago');
  const metodos = new Map([
    ['tarjeta', ['Tarjeta', 'La demostración no solicita número de tarjeta, vencimiento ni código de seguridad.']],
    ['pse', ['PSE', 'Simula el pago bancario dentro de JERUEL.']],
    ['nequi', ['Nequi', 'La demostración no solicita teléfono, claves ni códigos de aprobación.']]
  ]);
  let etapa = 'entrega';
  let resumenRevisado = '';

  function mostrarPaso(paso, enfocar = true) {
    etapa = paso;
    for (const indicador of pasos) {
      const actual = indicador.dataset.paso === paso;
      buscar('paso-' + indicador.dataset.paso).hidden = !actual;
      if (actual) indicador.setAttribute('aria-current', 'step');
      else indicador.removeAttribute('aria-current');
    }
    buscar('resumen-pago').hidden = paso === 'confirmacion';
    buscar('simular-pago').hidden = paso !== 'pago';
    if (enfocar) buscar('paso-' + paso).querySelector('h2').focus();
  }

  function pintarEntrega() {
    const { direcciones } = tienda.leerPerfil();
    const guardadas = Array.isArray(direcciones) ? direcciones.filter(item => item?.direccion && item.ciudad) : [];
    const opciones = guardadas.map(item => ({
      texto: [item.direccion, item.ciudad, item.departamento].filter(Boolean).join(', '),
      principal: Boolean(item.principal)
    }));
    opciones.push({ texto: 'Dirección de demostración' });
    const seleccion = opciones.find(item => item.principal) ?? opciones[0];
    for (const [indice, opcion] of opciones.entries()) {
      const fila = document.createElement('li');
      const etiqueta = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'direccion';
      radio.value = String(indice);
      radio.checked = opcion === seleccion;
      radio.dataset.texto = opcion.texto;
      etiqueta.append(radio, opcion.texto + (opcion.principal ? ' (principal)' : ''));
      fila.append(etiqueta);
      buscar('opciones-entrega').append(fila);
    }
  }

  function renderizarResumen(items) {
    const lista = buscar('articulos-pago');
    lista.replaceChildren();
    let subtotal = 0;
    for (const { id, cantidad } of items) {
      const producto = tienda.productos.get(id);
      const linea = document.createElement('li');
      linea.textContent = cantidad + ' × ' + producto.nombre;
      lista.append(linea);
      subtotal += cantidad * producto.precio;
    }
    buscar('subtotal-pago').textContent = tienda.precio(subtotal);
    buscar('total-pago').textContent = tienda.precio(subtotal);
    buscar('flujo-compra').hidden = items.length === 0;
    buscar('carrito-vacio-pago').hidden = items.length > 0;
    resumenRevisado = JSON.stringify(items);
    return subtotal;
  }

  formularioEntrega.addEventListener('submit', evento => {
    evento.preventDefault();
    const direccion = formularioEntrega.querySelector('input:checked');
    if (!direccion) return;
    buscar('entrega-seleccionada').textContent = direccion.dataset.texto;
    estado.textContent = '';
    const items = tienda.carrito();
    renderizarResumen(items);
    if (items.length) mostrarPaso('pago');
    else buscar('titulo-vacio').focus();
  });

  function actualizarAyuda() {
    const metodo = metodos.get(formularioPago.elements.metodo.value);
    buscar('ayuda-metodo').textContent = metodo[1];
  }
  formularioPago.addEventListener('change', actualizarAyuda);
  buscar('volver-entrega').addEventListener('click', () => mostrarPaso('entrega'));

  formularioPago.addEventListener('submit', evento => {
    evento.preventDefault();
    if (etapa !== 'pago') return;
    const items = tienda.carrito();
    const cambio = JSON.stringify(items) !== resumenRevisado;
    const subtotal = renderizarResumen(items);
    if (!items.length) {
      buscar('titulo-vacio').focus();
      return;
    }
    if (cambio) {
      estado.textContent = 'El carrito cambió. Revisa el nuevo total antes de continuar.';
      return;
    }

    const [nombre] = metodos.get(formularioPago.elements.metodo.value);
    buscar('detalle-confirmacion').textContent = 'Método: ' + nombre + ' · Total simulado: ' + tienda.precio(subtotal) + '.';
    estado.textContent = '';
    mostrarPaso('confirmacion');
  });

  pintarEntrega();
  actualizarAyuda();
  renderizarResumen(tienda.carrito());
})();
