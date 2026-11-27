(() => {
  'use strict';

  const baseArtesanal = 'Cera de soya, manteca de cacao y aceites esenciales.';
  const productos = new Map(Object.entries({
    chocolate: {
      nombre: 'Chocolate cremoso', precio: 15000,
      imagen: 'img/catalogo-chocolate.webp', frente: 'img/chocolate.png',
      variedad: 'Vela corporal', aroma: 'Chocolate',
      resumen: 'Aroma a cacao tostado con un fondo suave de chocolate con leche.',
      descripcion: 'Primero se percibe el cacao tostado y después una nota dulce de chocolate con leche. Al fundirse, la vela se convierte en un aceite tibio para el masaje.',
      ingredientes: baseArtesanal
    },
    frutos_rojos: {
      nombre: 'Frutos rojos silvestres', precio: 15000,
      imagen: 'img/catalogo-frutos-rojos.webp', frente: 'img/frutos_rojos.png',
      variedad: 'Vela corporal', aroma: 'Frutos rojos',
      resumen: 'La dulzura de la frambuesa se mezcla con una nota ácida de mora.',
      descripcion: 'El aroma recuerda a frambuesas maduras y a la acidez de una mora recién cortada. La cera se funde en un aceite tibio que acompaña el masaje con ese toque frutal.',
      ingredientes: baseArtesanal
    },
    maracuya: {
      nombre: 'Maracuyá tropical', precio: 15000,
      imagen: 'img/catalogo-maracuya.webp', frente: 'img/maracuya.png',
      variedad: 'Vela corporal', aroma: 'Maracuyá',
      resumen: 'Una nota fresca y agridulce, como el aroma de un maracuyá al abrirlo.',
      descripcion: 'El perfume combina la acidez del maracuyá con el dulzor de su pulpa madura. Al derretirse, la vela deja un aceite tibio de aroma tropical para el masaje.',
      ingredientes: baseArtesanal
    },
    bosque: {
      nombre: 'Vela Corporal Calidez del Bosque', precio: 15000, imagen: 'img/bosque1.png',
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
