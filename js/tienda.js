(() => {
  'use strict';

  const productos = new Map(Object.entries({
    lavanda: {
      nombre: 'Vela Corporal Lavanda Relajante', precio: 42000, imagen: 'img/lavanda.png',
      ambiente: 'img/lavanda2.png', variedad: 'Soya y karité', aroma: 'Lavanda',
      resumen: 'Aceite tibio para masajes con aroma de lavanda.',
      busqueda: 'soya karité masaje',
      descripcion: 'Vela corporal artesanal con aroma de lavanda. Al derretirse se convierte en un aceite tibio para masajes.',
      ingredientes: 'Cera de soya, manteca de karité, manteca de cacao, aceite esencial de lavanda y pabilo de algodón.'
    },
    cacao: {
      nombre: 'Vela Corporal Cacao y Vainilla', precio: 45000, imagen: 'img/cacao.png',
      variedad: 'Manteca de cacao', aroma: 'Cacao',
      descripcion: 'Una experiencia envolvente, de aroma dulce y cálido.'
    },
    citricos: {
      nombre: 'Vela Corporal Cítrica Energizante', precio: 42000, imagen: 'img/naranja.png',
      variedad: 'Cítricos', aroma: 'Cítricos',
      descripcion: 'Notas de naranja y bergamota para acompañar tu rutina.'
    },
    bosque: {
      nombre: 'Vela Corporal Calidez del Bosque', precio: 42000, imagen: 'img/bosque1.png',
      variedad: 'Frutos rojos', aroma: 'Frutos rojos',
      descripcion: 'Un aroma frutal para disfrutar una pausa especial.'
    }
  }));

  const claveFavoritos = 'jeruel_favoritos';
  const claveCarrito = 'jeruel_carrito';
  const claveCalificaciones = 'jeruel_calificaciones';
  const moneda = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
  const precio = valor => '$' + moneda.format(valor) + ' COP';
  const ficha = id => 'detalleProducto.html?producto=' + encodeURIComponent(id);

  function leer(clave, respaldo) {
    try { return JSON.parse(localStorage.getItem(clave)) ?? respaldo; }
    catch { return respaldo; }
  }

  function guardar(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch { return false; }
  }

  function leerPerfil() {
    return leer('jeruel_perfil', {});
  }

  function favoritos() {
    const ids = leer(claveFavoritos, []);
    return new Set(Array.isArray(ids) ? ids.filter(id => productos.has(id)) : []);
  }

  function alternarFavorito(id) {
    const ids = favoritos();
    const activo = !ids.delete(id);
    if (activo) ids.add(id);
    if (!guardar(claveFavoritos, [...ids])) return null;
    window.dispatchEvent(new Event('jeruel:favoritos'));
    return activo;
  }

  function alCambiarFavoritos(actualizar) {
    window.addEventListener('jeruel:favoritos', actualizar);
    window.addEventListener('storage', evento => {
      if (evento.key === claveFavoritos || evento.key === null) actualizar();
    });
    window.addEventListener('pageshow', actualizar);
  }

  function calificacion(id) {
    const valor = leer(claveCalificaciones, {})[id];
    return Number.isInteger(valor) && valor >= 1 && valor <= 5 ? valor : 0;
  }

  function guardarCalificacion(id, valor) {
    return guardar(claveCalificaciones, { ...leer(claveCalificaciones, {}), [id]: valor });
  }

  function carrito() {
    const items = leer(claveCarrito, []);
    return (Array.isArray(items) ? items : [])
      .filter(item => item && productos.has(item.id) && Number.isInteger(item.cantidad) && item.cantidad > 0)
      .map(item => ({ id: item.id, cantidad: Math.min(99, item.cantidad) }));
  }

  function agregarAlCarrito(id, cantidad) {
    if (!productos.has(id) || !Number.isInteger(cantidad) || cantidad < 1) return null;
    const items = carrito();
    const existente = items.find(item => item.id === id);
    const disponible = 99 - (existente?.cantidad ?? 0);
    const agregados = Math.min(disponible, cantidad);
    if (agregados === 0) return 0;
    if (existente) existente.cantidad += agregados;
    else items.push({ id, cantidad: agregados });
    return guardar(claveCarrito, items) ? agregados : null;
  }

  function actualizarCantidadCarrito(id, cantidad) {
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) return false;
    const items = carrito();
    const item = items.find(entrada => entrada.id === id);
    if (!item) return false;
    item.cantidad = cantidad;
    return guardar(claveCarrito, items);
  }

  function quitarDelCarrito(id) {
    return guardar(claveCarrito, carrito().filter(item => item.id !== id));
  }

  window.Jeruel = {
    productos, precio, ficha, leerPerfil, favoritos, alternarFavorito, alCambiarFavoritos,
    calificacion, guardarCalificacion, carrito, agregarAlCarrito, actualizarCantidadCarrito, quitarDelCarrito, claveCarrito
  };
})();
