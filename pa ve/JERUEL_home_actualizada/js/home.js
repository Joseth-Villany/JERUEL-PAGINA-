/* JERUEL - Interacciones locales de la página de inicio.
   No reemplaza un backend, inventario ni pasarela de pagos. */

(() => {
  'use strict';

  const tarjetas = [...document.querySelectorAll('.tarjeta-producto')];
  const productos = new Map(tarjetas.map(tarjeta => [tarjeta.dataset.id, {
    id: tarjeta.dataset.id,
    nombre: tarjeta.dataset.nombre,
    precio: Number(tarjeta.dataset.precio),
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
  const formatoPrecio = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  });

  function leerGuardado(clave, respaldo) {
    try {
      const valor = JSON.parse(localStorage.getItem(clave));
      return valor ?? respaldo;
    } catch {
      return respaldo;
    }
  }

  function guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); }
    catch { /* La página sigue funcionando incluso si el navegador bloquea el guardado. */ }
  }

  function normalizar(texto) {
    return String(texto).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  let categoriaActual = 'todas';
  const favoritosGuardados = leerGuardado('jeruel_favoritos', []);
  const favoritos = new Set((Array.isArray(favoritosGuardados) ? favoritosGuardados : []).filter(id => productos.has(id)));

  const carritoGuardado = leerGuardado('jeruel_carrito', []);
  const carrito = (Array.isArray(carritoGuardado) ? carritoGuardado : [])
    .filter(item => item && productos.has(item.id) && Number.isInteger(item.cantidad) && item.cantidad > 0)
    .map(item => ({ id: item.id, cantidad: Math.min(99, item.cantidad) }));

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
    document.querySelectorAll('[data-favorito]').forEach(boton => {
      const activo = favoritos.has(boton.dataset.favorito);
      const nombre = productos.get(boton.dataset.favorito).nombre;
      boton.setAttribute('aria-pressed', String(activo));
      boton.setAttribute('aria-label', `${activo ? 'Quitar' : 'Añadir'} ${nombre} ${activo ? 'de' : 'a'} favoritos`);
      boton.title = activo ? 'Quitar de favoritos' : 'Guardar favorito';
    });
  }

  document.querySelectorAll('[data-favorito]').forEach(boton => boton.addEventListener('click', () => {
    const id = boton.dataset.favorito;
    if (favoritos.has(id)) {
      favoritos.delete(id);
      avisar('Producto quitado de favoritos.');
    } else {
      favoritos.add(id);
      avisar('Producto guardado en favoritos.');
    }
    guardar('jeruel_favoritos', [...favoritos]);
    actualizarBotonesFavoritos();
    if (ventanaFavoritos.open) mostrarFavoritos();
  }));

  // CARRITO LOCAL
  function actualizarContador() {
    const cantidad = carrito.reduce((total, item) => total + item.cantidad, 0);
    contadorCarrito.value = contadorCarrito.textContent = String(cantidad);
    contadorCarrito.hidden = cantidad === 0;
    document.querySelector('#abrir-carrito').setAttribute('aria-label', `Ver carrito, ${cantidad} productos`);
  }

  function agregarAlCarrito(id) {
    const existente = carrito.find(item => item.id === id);
    if (existente) existente.cantidad = Math.min(99, existente.cantidad + 1);
    else carrito.push({ id, cantidad: 1 });
    guardar('jeruel_carrito', carrito);
    actualizarContador();
    avisar(`${productos.get(id).nombre} añadido al carrito.`);
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
    let total = 0;
    if (!carrito.length) {
      const mensaje = document.createElement('p');
      mensaje.className = 'mensaje-resumen';
      mensaje.textContent = 'Tu carrito está vacío. Descubre nuestras velas y añade tus favoritas.';
      contenedor.append(mensaje);
    }
    carrito.forEach(item => {
      const producto = productos.get(item.id);
      total += producto.precio * item.cantidad;
      lista.append(lineaResumen(producto.nombre,
        `${item.cantidad} × ${formatoPrecio.format(producto.precio)}`, 'Quitar', () => {
          carrito.splice(carrito.indexOf(item), 1);
          guardar('jeruel_carrito', carrito);
          actualizarContador();
          mostrarCarrito();
        }));
    });
    if (lista.childElementCount) contenedor.append(lista);
    document.querySelector('#total-carrito').textContent = formatoPrecio.format(total);
  }

  function mostrarFavoritos() {
    const contenedor = document.querySelector('#contenido-favoritos');
    const lista = document.createElement('ul');
    lista.className = 'lista-resumen';
    contenedor.replaceChildren();
    if (!favoritos.size) {
      const mensaje = document.createElement('p');
      mensaje.className = 'mensaje-resumen';
      mensaje.textContent = 'Todavía no has guardado velas favoritas.';
      contenedor.append(mensaje);
    }
    favoritos.forEach(id => {
      lista.append(lineaResumen(productos.get(id).nombre, 'Guardado en favoritos', 'Quitar', () => {
        favoritos.delete(id);
        guardar('jeruel_favoritos', [...favoritos]);
        actualizarBotonesFavoritos();
        mostrarFavoritos();
      }));
    });
    if (lista.childElementCount) contenedor.append(lista);
  }

  document.querySelector('#abrir-carrito').addEventListener('click', () => {
    mostrarCarrito();
    ventanaCarrito.showModal();
  });
  document.querySelector('#abrir-favoritos').addEventListener('click', () => {
    mostrarFavoritos();
    ventanaFavoritos.showModal();
  });
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
  actualizarBotonesFavoritos();
  actualizarContador();
  filtrarProductos();
})();
