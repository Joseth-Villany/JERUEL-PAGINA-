(() => {
  'use strict';

  const tienda = window.Jeruel;
  const buscar = id => document.getElementById(id);
  const lista = buscar('productos-carrito');
  const plantilla = buscar('plantilla-producto');
  const estado = buscar('estado-carrito');
  const error = buscar('error-carrito');

  function mostrarCarrito() {
    const items = tienda.carrito();
    const unidades = items.reduce((total, item) => total + item.cantidad, 0);
    const cantidad = buscar('cantidad-carrito');
    cantidad.textContent = unidades === 1 ? '1 unidad en tu carrito' : unidades + ' unidades en tu carrito';
    cantidad.hidden = !unidades;
    buscar('carrito-vacio').hidden = Boolean(unidades);
    buscar('carrito-con-productos').hidden = !unidades;
    buscar('resumen-carrito').hidden = !unidades;
    lista.replaceChildren();

    let subtotal = 0;
    for (const item of items) {
      const { nombre, imagen, precio } = tienda.productos.get(item.id);
      const fila = plantilla.content.cloneNode(true);
      fila.querySelector('li').dataset.producto = item.id;
      fila.querySelector('img').src = imagen;
      const enlace = fila.querySelector('.nombre-producto');
      enlace.href = tienda.ficha(item.id);
      enlace.textContent = nombre;
      fila.querySelector('.precio-unitario').textContent = tienda.precio(precio) + ' por unidad';
      const cantidad = fila.querySelector('.unidades');
      cantidad.value = cantidad.textContent = String(item.cantidad);
      fila.querySelector('legend').textContent = 'Cantidad de ' + nombre + ': ' + item.cantidad;
      fila.querySelector('.importe strong').textContent = tienda.precio(precio * item.cantidad);
      subtotal += precio * item.cantidad;

      const reducir = fila.querySelector('[data-accion="reducir"]');
      const aumentar = fila.querySelector('[data-accion="aumentar"]');
      reducir.setAttribute('aria-label', 'Reducir cantidad de ' + nombre);
      aumentar.setAttribute('aria-label', 'Aumentar cantidad de ' + nombre);
      reducir.disabled = item.cantidad === 1;
      aumentar.disabled = item.cantidad === 99;
      fila.querySelector('.quitar').setAttribute('aria-label', 'Quitar ' + nombre + ' del carrito');
      lista.append(fila);
    }
    buscar('subtotal-carrito').textContent = tienda.precio(subtotal);
  }

  lista.addEventListener('click', evento => {
    const boton = evento.target.closest('[data-accion]');
    if (!boton) return;
    const fila = boton.closest('[data-producto]');
    const id = fila.dataset.producto;
    const indice = [...lista.children].indexOf(fila);
    const accion = boton.dataset.accion;
    const cantidad = tienda.carrito().find(item => item.id === id)?.cantidad;
    if (!cantidad) {
      mostrarCarrito();
      (lista.querySelector('.nombre-producto') ?? buscar('explorar-catalogo')).focus();
      return;
    }

    const nuevaCantidad = cantidad + (accion === 'reducir' ? -1 : 1);
    if (accion === 'reducir' && nuevaCantidad < 1 || accion === 'aumentar' && nuevaCantidad > 99) {
      mostrarCarrito();
      lista.children[indice]?.querySelector('.nombre-producto').focus();
      return;
    }
    const quitado = accion === 'quitar';
    const guardado = quitado ? tienda.quitarDelCarrito(id) : tienda.actualizarCantidadCarrito(id, nuevaCantidad);
    error.hidden = guardado;
    if (!guardado) {
      error.textContent = 'No se pudo guardar el cambio. Comprueba el almacenamiento del navegador.';
      return;
    }

    mostrarCarrito();
    if (quitado) {
      const siguiente = lista.children[Math.min(indice, lista.children.length - 1)];
      (siguiente?.querySelector('.nombre-producto') ?? buscar('explorar-catalogo')).focus();
      estado.textContent = tienda.productos.get(id).nombre + ' se quitó del carrito.';
    } else {
      const actual = [...lista.children].find(producto => producto.dataset.producto === id);
      (actual?.querySelector('[data-accion="' + accion + '"]:enabled') ??
        actual?.querySelector('.cantidad button:enabled') ?? buscar('explorar-catalogo')).focus();
      estado.textContent = 'Cantidad: ' + nuevaCantidad + '. Subtotal: ' + buscar('subtotal-carrito').textContent + '.';
    }
  });

  window.addEventListener('storage', evento => {
    if (evento.key === tienda.claveCarrito || evento.key === null) mostrarCarrito();
  });
  window.addEventListener('pageshow', mostrarCarrito);
  mostrarCarrito();
})();
