/* JERUEL - Interacciones locales de la página de inicio.
   No reemplaza un backend, inventario ni pasarela de pagos. */

(() => {
  'use strict';

  const tienda = window.Jeruel;
  const tarjetas = [...document.querySelectorAll('.tarjeta-producto')];
  const productos = new Map(tarjetas.map(tarjeta => [tarjeta.dataset.id, {
    id: tarjeta.dataset.id,
    nombre: tienda.productos.get(tarjeta.dataset.id).nombre,
    categoria: tarjeta.dataset.categoria,
    busqueda: tarjeta.dataset.busqueda
  }]));

  const botonesFiltro = [...document.querySelectorAll('.boton-filtro')];
  const campoBusqueda = document.querySelector('#campo-busqueda');
  const estadoCatalogo = document.querySelector('#estado-catalogo');
  const catalogoVacio = document.querySelector('#catalogo-vacio');
  const contadorCarrito = document.querySelector('#contador-carrito');
  const avisoAccion = document.querySelector('#aviso-accion');
  const ventanaCarrito = document.querySelector('#ventana-carrito');
  const ventanaFavoritos = document.querySelector('#ventana-favoritos');
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
      const producto = productos.get(tarjeta.dataset.id);
      const coincideCategoria = categoriaActual === 'todas' || producto.categoria === categoriaActual;
      const coincideBusqueda = !texto || normalizar(`${producto.nombre} ${producto.busqueda}`).includes(texto);
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
    document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth' });
  });
  document.querySelector('#limpiar-filtros').addEventListener('click', () => {
    campoBusqueda.value = '';
    seleccionarCategoria('todas');
  });

  // MENÚ DE PANTALLAS PEQUEÑAS
  const botonMenu = document.querySelector('#boton-menu');
  const navegacion = document.querySelector('#navegacion-principal');
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
  navegacion.querySelectorAll('a').forEach(enlace => enlace.addEventListener('click', cerrarMenu));

  // MENSAJE BREVE DE CONFIRMACIÓN
  let temporizadorAviso;
  function avisar(mensaje) {
    avisoAccion.textContent = mensaje;
    avisoAccion.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { avisoAccion.hidden = true; }, 2600);
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
    avisar(agregado ? `${tienda.productos.get(id).nombre} añadido al carrito.` :
      'Alcanzaste el límite de unidades para este producto.');
    if (ventanaCarrito.open) mostrarCarrito();
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
    let total = 0;
    if (!carrito.length) {
      const mensaje = document.createElement('p');
      mensaje.className = 'mensaje-resumen';
      mensaje.textContent = 'Tu carrito está vacío. Descubre nuestras velas y añade tus favoritas.';
      contenedor.append(mensaje);
    }
    carrito.forEach(item => {
      const producto = tienda.productos.get(item.id);
      total += producto.precio * item.cantidad;
      lista.append(lineaResumen(producto.nombre,
        `${item.cantidad} × ${tienda.precio(producto.precio)}`, 'Quitar', () => {
          if (!tienda.quitarDelCarrito(item.id)) {
            avisar('No se pudo actualizar el carrito.');
            return;
          }
          actualizarContador();
          mostrarCarrito();
        }));
    });
    if (lista.childElementCount) contenedor.append(lista);
    document.querySelector('#total-carrito').textContent = tienda.precio(total);
  }

  function abrirCarrito() {
    mostrarCarrito();
    if (!ventanaCarrito.open) ventanaCarrito.showModal();
  }

  function actualizarCarrito() {
    actualizarContador();
    if (ventanaCarrito.open) mostrarCarrito();
  }

  document.querySelector('#abrir-carrito').addEventListener('click', abrirCarrito);
  document.querySelector('#abrir-favoritos').addEventListener('click', () => ventanaFavoritos.showModal());
  window.addEventListener('pageshow', actualizarCarrito);
  window.addEventListener('storage', evento => {
    if (evento.key === tienda.claveCarrito || evento.key === null) actualizarCarrito();
  });
  window.addEventListener('hashchange', () => {
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
  filtrarProductos();
})();
