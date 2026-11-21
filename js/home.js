/* JERUEL - Interacciones locales de la página de inicio.
   No reemplaza un backend, inventario ni pasarela de pagos. */

(() => {
  'use strict';

  const tienda = window.Jeruel;
  const plantilla = document.querySelector('#plantilla-tarjeta');
  const listaProductos = document.querySelector('#lista-productos');
  const filtros = document.querySelector('#filtros-catalogo');
  const aromas = new Set();

  for (const [id, producto] of tienda.productos) {
    const tarjeta = plantilla.content.firstElementChild.cloneNode(true);
    tarjeta.id = 'producto-' + id;
    tarjeta.dataset.id = id;
    const enlaceFoto = tarjeta.querySelector('.enlace-imagen-producto');
    const imagen = enlaceFoto.querySelector('img');
    const enlaceNombre = tarjeta.querySelector('h3 a');
    enlaceFoto.href = enlaceNombre.href = tienda.ficha(id);
    imagen.src = producto.imagen;
    imagen.alt = producto.nombre;
    enlaceNombre.textContent = producto.nombre;
    tarjeta.querySelector('.ingredientes-producto').textContent = producto.variedad;
    tarjeta.querySelector('.descripcion-producto').textContent = producto.resumen ?? producto.descripcion;
    const precio = tarjeta.querySelector('.precio-producto');
    precio.value = producto.precio;
    precio.textContent = tienda.precio(producto.precio);
    tarjeta.querySelector('.boton-favorito').dataset.favorito = id;
    const agregar = tarjeta.querySelector('.boton-agregar');
    agregar.dataset.agregar = id;
    agregar.setAttribute('aria-label', `Agregar ${producto.nombre} al carrito`);
    listaProductos.append(tarjeta);

    if (aromas.has(producto.aroma)) continue;
    aromas.add(producto.aroma);
    const filtro = document.createElement('button');
    filtro.type = 'button';
    filtro.className = 'boton-filtro';
    filtro.dataset.categoria = producto.aroma;
    filtro.setAttribute('aria-pressed', 'false');
    filtro.textContent = producto.aroma;
    filtros.append(filtro);
  }

  const tarjetas = [...listaProductos.children];
  const botonesFiltro = [...document.querySelectorAll('.boton-filtro')];
  const campoBusqueda = document.querySelector('#campo-busqueda');
  const estadoCatalogo = document.querySelector('#estado-catalogo');
  const catalogoVacio = document.querySelector('#catalogo-vacio');
  const contadorCarrito = document.querySelector('#contador-carrito');
  const avisoAccion = document.querySelector('#aviso-accion');
  const ventanaCarrito = document.querySelector('#ventana-carrito');
  const ventanaFavoritos = document.querySelector('#ventana-favoritos');
  const estadoCarritoRapido = document.querySelector('#estado-carrito-rapido');
  function normalizar(texto) {
    return String(texto).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  let categoriaActual = 'todas';

  // FILTROS Y BÚSQUEDA
  function seleccionarCategoria(categoria) {
    categoriaActual = categoria;
    botonesFiltro.forEach(boton => {
      const activo = boton.dataset.categoria === categoria;
      boton.classList.toggle('filtro-activo', activo);
      boton.setAttribute('aria-pressed', String(activo));
    });
    filtrarProductos();
  }

  function filtrarProductos() {
    const texto = normalizar(campoBusqueda.value);
    let visibles = 0;

    tarjetas.forEach(tarjeta => {
      const producto = tienda.productos.get(tarjeta.dataset.id);
      const coincideCategoria = categoriaActual === 'todas' || producto.aroma === categoriaActual;
      const palabras = normalizar([producto.nombre, producto.aroma, producto.variedad, producto.descripcion, producto.busqueda].join(' '));
      const coincideBusqueda = texto.split(/\s+/).every(palabra => palabras.includes(palabra));
      const mostrar = coincideCategoria && coincideBusqueda;
      tarjeta.hidden = !mostrar;
      if (mostrar) visibles++;
    });

    estadoCatalogo.textContent = `${visibles} ${visibles === 1 ? 'producto disponible' : 'productos disponibles'}`;
    catalogoVacio.hidden = visibles !== 0;
  }

  botonesFiltro.forEach(boton => boton.addEventListener('click', () => seleccionarCategoria(boton.dataset.categoria)));
  campoBusqueda.addEventListener('input', filtrarProductos);
  document.querySelector('#formulario-busqueda').addEventListener('submit', evento => {
    evento.preventDefault();
    filtrarProductos();
  });
  document.querySelector('#limpiar-filtros').addEventListener('click', () => {
    campoBusqueda.value = '';
    seleccionarCategoria('todas');
    campoBusqueda.focus();
  });

  // MENÚ DE PANTALLAS PEQUEÑAS
  const botonMenu = document.querySelector('#boton-menu');
  const navegacion = document.querySelector('#navegacion-principal');
  const enlacesNavegacion = [...navegacion.querySelectorAll('a')];

  function actualizarNavegacion() {
    const actual = enlacesNavegacion.find(enlace => enlace.hash === location.hash) ?? enlacesNavegacion[0];
    for (const enlace of enlacesNavegacion) {
      enlace.classList.toggle('enlace-activo', enlace === actual);
      if (enlace === actual) enlace.setAttribute('aria-current', 'location');
      else enlace.removeAttribute('aria-current');
    }
  }

  function cerrarMenu() {
    navegacion.dataset.menuAbierto = 'false';
    botonMenu.setAttribute('aria-expanded', 'false');
    botonMenu.setAttribute('aria-label', 'Abrir menú');
  }
  botonMenu.addEventListener('click', () => {
    const abierto = navegacion.dataset.menuAbierto !== 'true';
    navegacion.dataset.menuAbierto = String(abierto);
    botonMenu.setAttribute('aria-expanded', String(abierto));
    botonMenu.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
  });
  enlacesNavegacion.forEach(enlace => enlace.addEventListener('click', cerrarMenu));
  document.addEventListener('keydown', evento => {
    if (evento.key !== 'Escape' || navegacion.dataset.menuAbierto !== 'true') return;
    cerrarMenu();
    botonMenu.focus();
  });

  // MENSAJE BREVE DE CONFIRMACIÓN
  let temporizadorAviso;
  function avisar(mensaje) {
    avisoAccion.textContent = mensaje;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { avisoAccion.textContent = ''; }, 3000);
  }

  // FAVORITOS
  function actualizarBotonesFavoritos() {
    const favoritos = tienda.favoritos();
    document.querySelectorAll('[data-favorito]').forEach(boton => {
      const activo = favoritos.has(boton.dataset.favorito);
      const nombre = tienda.productos.get(boton.dataset.favorito).nombre;
      boton.setAttribute('aria-pressed', String(activo));
      boton.setAttribute('aria-label', `${activo ? 'Quitar' : 'Añadir'} ${nombre} ${activo ? 'de' : 'a'} favoritos`);
      boton.title = activo ? 'Quitar de favoritos' : 'Guardar favorito';
    });
  }

  document.querySelectorAll('[data-favorito]').forEach(boton => boton.addEventListener('click', () => {
    const id = boton.dataset.favorito;
    const activo = tienda.alternarFavorito(id);
    avisar(activo === null ? 'No se pudo guardar el cambio en este navegador.' :
      activo ? 'Producto guardado en favoritos.' : 'Producto quitado de favoritos.');
  }));

  // CARRITO LOCAL
  function actualizarContador() {
    const cantidad = tienda.carrito().reduce((total, item) => total + item.cantidad, 0);
    contadorCarrito.value = contadorCarrito.textContent = String(cantidad);
    contadorCarrito.hidden = cantidad === 0;
    document.querySelector('#abrir-carrito').setAttribute('aria-label', `Ver carrito, ${cantidad} productos`);
  }

  function agregarAlCarrito(id) {
    const agregado = tienda.agregarAlCarrito(id, 1);
    if (agregado === null) {
      avisar('No se pudo guardar el carrito en este navegador.');
      return;
    }
    actualizarContador();
    if (!agregado) {
      avisar('Alcanzaste el límite de unidades para este producto.');
      return;
    }
    abrirCarrito();
    estadoCarritoRapido.textContent = `${tienda.productos.get(id).nombre} se añadió al carrito.`;
  }

  document.querySelectorAll('[data-agregar]').forEach(boton => boton.addEventListener('click', () => {
    agregarAlCarrito(boton.dataset.agregar);
  }));

  // Elementos creados con textContent para no interpretar datos guardados como HTML.
  function lineaResumen(nombre, detalle, textoBoton, accion) {
    const fila = document.createElement('li');
    fila.className = 'linea-resumen';
    const datos = document.createElement('p');
    const titulo = document.createElement('strong');
    titulo.textContent = nombre;
    const subtitulo = document.createElement('small');
    subtitulo.textContent = detalle;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = textoBoton;
    boton.addEventListener('click', accion);
    datos.append(titulo, subtitulo);
    fila.append(datos, boton);
    return fila;
  }

  function mostrarCarrito() {
    const contenedor = document.querySelector('#contenido-carrito');
    const lista = document.createElement('ul');
    lista.className = 'lista-resumen';
    contenedor.replaceChildren();
    const carrito = tienda.carrito();
    document.querySelector('#resumen-carrito-rapido').hidden = carrito.length === 0;
    let total = 0;
    if (!carrito.length) {
      const mensaje = document.createElement('p');
      mensaje.className = 'mensaje-resumen';
      mensaje.textContent = 'Tu carrito está vacío. Descubre nuestras velas y añade tus favoritas.';
      contenedor.append(mensaje);
    }
    carrito.forEach((item, indice) => {
      const producto = tienda.productos.get(item.id);
      total += producto.precio * item.cantidad;
      lista.append(lineaResumen(producto.nombre,
        `${item.cantidad} × ${tienda.precio(producto.precio)}`, 'Quitar', () => {
          if (!tienda.quitarDelCarrito(item.id)) {
            estadoCarritoRapido.textContent = 'No se pudo actualizar el carrito.';
            return;
          }
          actualizarContador();
          mostrarCarrito();
          estadoCarritoRapido.textContent = `${producto.nombre} se quitó del carrito.`;
          const botones = contenedor.querySelectorAll('.linea-resumen button');
          (botones[Math.min(indice, botones.length - 1)] ?? ventanaCarrito.querySelector('[data-cerrar]')).focus();
        }));
      lista.lastElementChild.querySelector('button').setAttribute('aria-label', `Quitar ${producto.nombre} del carrito`);
    });
    if (lista.childElementCount) contenedor.append(lista);
    document.querySelector('#total-carrito').textContent = tienda.precio(total);
  }

  function abrirCarrito() {
    estadoCarritoRapido.textContent = '';
    mostrarCarrito();
    if (!ventanaCarrito.open) ventanaCarrito.showModal();
  }

  function actualizarCarrito() {
    actualizarContador();
    if (ventanaCarrito.open) mostrarCarrito();
  }

  document.querySelector('#abrir-carrito').addEventListener('click', abrirCarrito);
  document.querySelector('#abrir-favoritos').addEventListener('click', () => ventanaFavoritos.showModal());
  ventanaFavoritos.addEventListener('click', evento => {
    if (!evento.target.closest('.explorar-favoritos')) return;
    evento.preventDefault();
    ventanaFavoritos.close();
    location.hash = 'catalogo';
    campoBusqueda.focus({ preventScroll: true });
  });
  window.addEventListener('pageshow', actualizarCarrito);
  window.addEventListener('storage', evento => {
    if (evento.key === tienda.claveCarrito || evento.key === null) actualizarCarrito();
  });
  window.addEventListener('hashchange', () => {
    actualizarNavegacion();
    if (location.hash === '#carrito') abrirCarrito();
  });
  if (location.hash === '#carrito') abrirCarrito();

  document.querySelectorAll('[data-cerrar]').forEach(boton => boton.addEventListener('click', () => {
    document.getElementById(boton.dataset.cerrar).close();
  }));
  [ventanaCarrito, ventanaFavoritos].forEach(ventana => ventana.addEventListener('click', evento => {
    if (evento.target === ventana) ventana.close();
  }));

  // Si las imágenes originales no fueron copiadas, mostrar un fondo legible.
  document.querySelectorAll('.imagen-producto img').forEach(imagen => {
    const mostrarFondo = () => {
      imagen.closest('figure').classList.add('imagen-no-disponible');
      imagen.hidden = true;
    };
    imagen.addEventListener('error', mostrarFondo);
    if (imagen.complete && imagen.naturalWidth === 0) mostrarFondo();
  });

  const anio = document.querySelector('#anio-actual');
  anio.dateTime = anio.textContent = String(new Date().getFullYear());
  tienda.alCambiarFavoritos(actualizarBotonesFavoritos);
  actualizarBotonesFavoritos();
  actualizarContador();
  actualizarNavegacion();
  filtrarProductos();
})();
