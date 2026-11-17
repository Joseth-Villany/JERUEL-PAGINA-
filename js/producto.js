(() => {
  'use strict';

  const tienda = window.Jeruel;
  const buscar = id => document.getElementById(id);
  const id = new URLSearchParams(window.location.search).get('producto') ?? 'lavanda';
  const producto = tienda.productos.get(id);

  if (!producto) {
    buscar('producto-no-disponible').hidden = false;
    return;
  }

  document.title = `${producto.nombre} | JERUEL`;
  buscar('nombre-producto').textContent = producto.nombre;
  buscar('variedad-producto').textContent = producto.variedad;
  buscar('precio-producto').value = producto.precio;
  buscar('precio-producto').textContent = tienda.precio(producto.precio);
  buscar('descripcion-producto').textContent = producto.descripcion;
  if (producto.ingredientes) {
    buscar('ingredientes').textContent = producto.ingredientes;
    buscar('detalle-ingredientes').hidden = false;
  }

  const foto = buscar('imagen-producto');
  const miniaturas = buscar('miniaturas');
  foto.src = producto.ambiente ?? producto.imagen;
  foto.alt = producto.ambiente ? producto.nombre + ' en una escena de cuidado corporal' : producto.nombre;

  if (producto.ambiente) {
    [[producto.ambiente, 'Vista ambientada', foto.alt], [producto.imagen, 'Vista de frente', producto.nombre]].forEach(
      ([ruta, etiqueta, descripcion], indice) => {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.setAttribute('aria-label', etiqueta);
        boton.setAttribute('aria-pressed', String(indice === 0));
        const imagen = document.createElement('img');
        imagen.src = ruta;
        imagen.alt = '';
        boton.append(imagen);
        boton.addEventListener('click', () => {
          foto.src = ruta;
          foto.alt = descripcion;
          miniaturas.querySelectorAll('button').forEach(control => {
            control.setAttribute('aria-pressed', String(control === boton));
          });
        });
        miniaturas.append(boton);
      }
    );
    miniaturas.hidden = false;
  }

  const favorito = buscar('favorito-producto');
  const estadoCompra = buscar('estado-compra');
  const actualizarFavorito = () => favorito.setAttribute('aria-pressed', String(tienda.favoritos().has(id)));
  tienda.alCambiarFavoritos(actualizarFavorito);
  actualizarFavorito();
  favorito.addEventListener('click', () => {
    const activo = tienda.alternarFavorito(id);
    estadoCompra.textContent = activo === null ? 'No se pudo guardar el cambio en este navegador.' :
      activo ? 'Producto guardado en favoritos.' : 'Producto quitado de favoritos.';
  });

  const cantidad = buscar('cantidad');
  const reducir = buscar('reducir-cantidad');
  const aumentar = buscar('aumentar-cantidad');
  function actualizarCantidad() {
    reducir.disabled = cantidad.valueAsNumber <= Number(cantidad.min);
    aumentar.disabled = cantidad.valueAsNumber >= Number(cantidad.max);
  }
  function ajustarCantidad(paso) {
    const valor = cantidad.valueAsNumber || 1;
    cantidad.value = Math.max(Number(cantidad.min), Math.min(Number(cantidad.max), valor + paso));
    actualizarCantidad();
  }
  actualizarCantidad();
  cantidad.addEventListener('input', actualizarCantidad);
  reducir.addEventListener('click', () => ajustarCantidad(-1));
  aumentar.addEventListener('click', () => ajustarCantidad(1));
  buscar('formulario-compra').addEventListener('submit', evento => {
    evento.preventDefault();
    const agregados = tienda.agregarAlCarrito(id, cantidad.valueAsNumber);
    if (agregados === null) estadoCompra.textContent = 'No se pudo guardar el carrito en este navegador.';
    else if (agregados === 0) estadoCompra.textContent = 'Alcanzaste el límite de unidades para este producto.';
    else estadoCompra.textContent = agregados === 1 ? '1 unidad añadida al carrito.' : `${agregados} unidades añadidas al carrito.`;
  });

  const formulario = buscar('formulario-calificacion');
  const estrellas = formulario.elements.estrellas;
  const estadoCalificacion = buscar('estado-calificacion');
  const calificacion = tienda.calificacion(id);
  if (calificacion) {
    estrellas.value = String(calificacion);
    estadoCalificacion.textContent = `Tu calificación guardada: ${calificacion} de 5.`;
  }
  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    const valor = Number(estrellas.value);
    estadoCalificacion.textContent = tienda.guardarCalificacion(id, valor) ?
      `Tu calificación guardada: ${valor} de 5.` : 'No se pudo guardar tu calificación en este navegador.';
  });

  buscar('ficha-producto').hidden = false;
})();
