(() => {
  'use strict';

  const tienda = window.Jeruel;
  const { elemento, fechaHTML, precio, estados, medios } = tienda;
  const buscar = id => document.getElementById(id);
  const menu = buscar('menu-cuenta');
  const mediosPantalla = matchMedia('(min-width: 768px)');
  const enlaces = [...menu.querySelectorAll('nav a')];
  const secciones = [...document.querySelectorAll('.contenido-cuenta > section')];
  function enSesion() {
    try { return sessionStorage.getItem('jeruel_sesion_demo') === 'activa'; }
    catch { return false; }
  }
  const enlace = (texto, url, clase = 'boton secundario') => Object.assign(elemento('a', texto, clase), { href: url });
  const boton = (texto, accion, clase = 'boton secundario') => {
    const control = Object.assign(elemento('button', texto, clase), { type: 'button' });
    control.addEventListener('click', accion);
    return control;
  };

  function guardar(cambios, destino, mensaje) {
    const guardado = tienda.guardarPerfil(cambios);
    buscar(destino).textContent = guardado ? mensaje : 'No se pudo guardar el cambio en este navegador.';
    return guardado;
  }

  function etiquetaEstado(estado) {
    const etiqueta = elemento('span', estados[estado], 'estado-pedido estado-' + estado);
    return etiqueta;
  }

  function actualizarResumen() {
    const pedidos = tienda.pedidos();
    buscar('cuenta-pedidos').textContent = pedidos.length;
    buscar('cuenta-favoritos').textContent = tienda.favoritos().size;
    buscar('cuenta-direcciones').textContent = (tienda.leerPerfil().direcciones ?? []).length;
    const [ultimo] = pedidos;
    buscar('ultimo-pedido').textContent = ultimo ? ultimo.id + ' · ' + estados[ultimo.estado] + ' · ' + precio(tienda.total(ultimo)) : 'Tus pedidos aparecerán aquí.';
    buscar('ir-a-pedidos').textContent = ultimo ? 'Ver detalle del último pedido' : 'Explorar el catálogo';
    buscar('ir-a-pedidos').href = ultimo ? '#pedido/' + ultimo.id : 'homeScreen.html#catalogo';
  }

  const entradaBusqueda = buscar('buscar-pedidos');
  const filtro = buscar('filtrar-pedidos');
  const normalizar = texto => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

  function actualizarPedidos() {
    const consulta = normalizar(entradaBusqueda.value);
    const resultados = tienda.pedidos().filter(pedido =>
      (!filtro.value || pedido.estado === filtro.value) &&
      normalizar([pedido.id, ...pedido.items.map(item => item.nombre)].join(' ')).includes(consulta)
    );
    const lista = buscar('lista-pedidos');
    lista.replaceChildren();
    for (const pedido of resultados) {
      const fila = elemento('tr');
      const numero = elemento('th', pedido.id);
      numero.scope = 'row';
      fila.append(numero);
      const acciones = elemento('div', undefined, 'acciones');
      acciones.append(enlace('Ver detalle', '#pedido/' + pedido.id));
      if (pedido.estado === 'pendiente') acciones.append(enlace('Pagar ahora', 'metodosPago.html?pedido=' + pedido.id, 'boton primario'));
      for (const [titulo, contenido] of [
        ['Fecha', fechaHTML(pedido.fecha)], ['Estado', etiquetaEstado(pedido.estado)],
        ['Total', precio(tienda.total(pedido))], ['Acción', acciones]
      ]) {
        const celda = elemento('td');
        const etiqueta = elemento('span', titulo, 'etiqueta-tabla');
        etiqueta.setAttribute('aria-hidden', 'true');
        celda.append(etiqueta, contenido);
        fila.append(celda);
      }
      lista.append(fila);
    }
    buscar('resultados-pedidos').textContent = resultados.length === 1 ? '1 pedido' : resultados.length + ' pedidos';
    buscar('tabla-pedidos').hidden = !resultados.length;
    buscar('pedidos-vacios').hidden = Boolean(resultados.length);
  }

  entradaBusqueda.addEventListener('input', actualizarPedidos);
  filtro.addEventListener('change', actualizarPedidos);
  buscar('limpiar-pedidos').addEventListener('click', () => {
    entradaBusqueda.value = '';
    filtro.value = '';
    actualizarPedidos();
    entradaBusqueda.focus();
  });

  function mostrarDetalle(id) {
    const destino = buscar('contenido-pedido');
    destino.replaceChildren();
    const pedido = tienda.pedidos().find(entrada => entrada.id === id);
    buscar('titulo-detalle').textContent = pedido ? 'Pedido ' + pedido.id : 'Pedido no encontrado';
    if (!pedido) {
      destino.append(elemento('p', 'Vuelve a Mis pedidos para elegir un pedido de prueba.'));
      return;
    }

    const resumen = elemento('p', undefined, 'estado-detalle');
    resumen.append(etiquetaEstado(pedido.estado), fechaHTML(pedido.fecha));
    const items = elemento('ul', undefined, 'lista-cuenta');
    for (const item of pedido.items) {
      const fila = elemento('li', undefined, 'linea-pedido');
      const imagen = Object.assign(elemento('img'), { src: item.imagen, alt: '', width: 80, height: 80 });
      const info = elemento('div');
      info.append(elemento('h3', item.nombre), elemento('p', item.cantidad + ' × ' + precio(item.precio)));
      fila.append(imagen, info, elemento('strong', precio(item.precio * item.cantidad)));
      items.append(fila);
    }

    const pasos = ['Pedido registrado', ...Object.values(estados)];
    const activo = Object.keys(estados).indexOf(pedido.estado) + 1;
    const seguimiento = elemento('ol', undefined, 'seguimiento');
    for (const [indice, texto] of pasos.entries()) {
      if (indice === 1 && activo > 1) continue;
      const paso = elemento('li', texto);
      if (indice === activo) paso.setAttribute('aria-current', 'step');
      if (indice === 0) paso.append(' · ', fechaHTML(pedido.fecha));
      if (indice === activo && pedido.pagoFecha) paso.append(' · ', fechaHTML(pedido.pagoFecha));
      seguimiento.append(paso);
    }

    const costos = elemento('dl', undefined, 'costos');
    for (const [etiqueta, valor] of [
      ['Dirección de envío', pedido.direccion], ['Método', medios[pedido.medio] ?? 'Por seleccionar'],
      ['Subtotal', precio(tienda.subtotal(pedido))], ['Envío', precio(pedido.envio)], ['Total', precio(tienda.total(pedido))]
    ]) costos.append(elemento('dt', etiqueta), elemento('dd', valor));

    const acciones = elemento('div', undefined, 'acciones');
    if (pedido.estado === 'pendiente') acciones.append(enlace('Pagar ahora', 'metodosPago.html?pedido=' + pedido.id, 'boton primario'));
    if (pedido.estado === 'entregado') {
      const estado = elemento('p', '', 'estado');
      estado.setAttribute('role', 'status');
      acciones.append(boton('Volver a comprar', () => {
        const resultados = pedido.items.map(item => tienda.agregarAlCarrito(item.id, item.cantidad));
        const agregados = resultados.reduce((suma, cantidad) => suma + (cantidad ?? 0), 0);
        estado.textContent = agregados ? agregados + ' unidades añadidas al carrito.' : 'No se añadieron unidades. Revisa el carrito.';
        if (agregados && !acciones.querySelector('a[href="carrito.html"]')) acciones.append(enlace('Ver carrito', 'carrito.html', 'boton primario'));
      }), estado);
    }
    acciones.append(boton('Reportar un problema', () => {
      location.hash = 'ayuda';
      buscar('pedido-soporte').value = pedido.id;
    }));
    destino.append(resumen, elemento('h3', 'Productos'), items, elemento('h3', 'Seguimiento'), seguimiento, elemento('h3', 'Entrega y costos'), costos, acciones);
  }

  function navegar(enfocar = false) {
    const hash = location.hash.slice(1);
    const pedido = hash.startsWith('pedido/') ? hash.slice(7) : '';
    const vista = pedido ? 'detalle-pedido' : enlaces.some(item => item.hash.slice(1) === hash) ? hash : 'resumen';
    if (pedido) mostrarDetalle(pedido);
    for (const seccion of secciones) seccion.hidden = seccion.id !== vista;
    for (const item of enlaces) {
      if (item.hash.slice(1) === (pedido ? 'pedidos' : vista)) item.setAttribute('aria-current', 'location');
      else item.removeAttribute('aria-current');
    }
    if (enfocar && hash !== 'contenido') {
      if (!mediosPantalla.matches) menu.open = false;
      buscar(vista).querySelector('h2').focus();
    }
  }

  const adaptarMenu = () => { menu.open = mediosPantalla.matches; };
  mediosPantalla.addEventListener('change', adaptarMenu);
  adaptarMenu();
  window.addEventListener('hashchange', () => navegar(true));
  menu.addEventListener('click', evento => {
    const destino = evento.target.closest('nav a');
    if (destino && destino.hash === location.hash) navegar(true);
  });

  const selectorFavorito = buscar('selector-favorito');
  function actualizarFavoritos() {
    actualizarResumen();
    const guardados = tienda.favoritos();
    selectorFavorito.replaceChildren(new Option('Selecciona una vela', ''));
    for (const [id, producto] of tienda.productos) {
      if (!guardados.has(id)) selectorFavorito.add(new Option(producto.nombre, id));
    }
    selectorFavorito.form.hidden = guardados.size === tienda.productos.size;
  }
  tienda.alCambiarFavoritos(actualizarFavoritos);
  buscar('formulario-favorito').addEventListener('submit', evento => {
    evento.preventDefault();
    const id = selectorFavorito.value;
    if (!tienda.productos.has(id) || tienda.favoritos().has(id)) return;
    const activo = tienda.alternarFavorito(id);
    buscar('estado-favorito').textContent = activo ? 'Vela guardada en favoritos.' : 'No se pudo guardar la vela.';
    if (selectorFavorito.form.hidden) buscar('titulo-favoritos').focus();
  });

  const referencias = {
    tarjeta: ['Visa •••• 4242', 'Mastercard •••• 4444'],
    pse: ['Cuenta PSE •••• 0101', 'Cuenta PSE •••• 0202'],
    nequi: ['Nequi •••• 0101', 'Nequi •••• 0202']
  };
  const formularioMedio = buscar('formulario-medio');
  const tipoMedio = buscar('tipo-medio');
  const referenciaMedio = buscar('referencia-medio');
  const principal = buscar('medio-principal');
  const agregarMedio = buscar('agregar-medio');
  const leerMedios = () => tienda.leerPerfil().mediosPago ?? [];
  let editandoMedio;
  let origenMedio;

  function opcionesMedio() {
    referenciaMedio.replaceChildren(...referencias[tipoMedio.value].map(ref => new Option(ref)));
  }
  tipoMedio.addEventListener('change', opcionesMedio);

  function abrirMedio(medio, origen) {
    editandoMedio = medio?.id;
    origenMedio = origen;
    formularioMedio.reset();
    tipoMedio.value = medio?.tipo ?? 'tarjeta';
    opcionesMedio();
    if (medio) referenciaMedio.value = medio.referencia;
    principal.checked = Boolean(medio?.principal) || !leerMedios().length;
    principal.disabled = principal.checked;
    formularioMedio.hidden = false;
    agregarMedio.hidden = true;
    tipoMedio.focus();
  }

  function cerrarMedio(origen) {
    formularioMedio.hidden = true;
    agregarMedio.hidden = false;
    (origen?.isConnected ? origen : agregarMedio).focus();
  }

  agregarMedio.addEventListener('click', evento => abrirMedio(null, evento.currentTarget));
  buscar('cancelar-medio').addEventListener('click', () => cerrarMedio(origenMedio));

  function actualizarMedios() {
    const lista = buscar('lista-medios');
    lista.replaceChildren();
    const entradas = leerMedios();
    buscar('medios-vacios').hidden = Boolean(entradas.length);
    for (const medio of entradas) {
      const fila = elemento('li', undefined, 'direccion-guardada');
      const acciones = elemento('div', undefined, 'acciones');
      acciones.append(boton('Editar', evento => abrirMedio(medio, evento.currentTarget)));
      if (!medio.principal) acciones.append(boton('Hacer predeterminado', () => {
        const nuevos = leerMedios().map(item => ({ ...item, principal: item.id === medio.id }));
        if (guardar({ mediosPago: nuevos }, 'estado-medios', 'Medio predeterminado actualizado.')) {
          actualizarMedios();
          cerrarMedio();
        }
      }));
      acciones.append(boton('Eliminar', () => confirmar('Eliminar medio de pago', 'Se quitará esta referencia de prueba.', () => {
        const nuevos = leerMedios().filter(item => item.id !== medio.id);
        if (nuevos.length && !nuevos.some(item => item.principal)) nuevos[0].principal = true;
        if (guardar({ mediosPago: nuevos }, 'estado-medios', 'Medio eliminado.')) {
          actualizarMedios();
          cerrarMedio();
        }
      })));
      fila.append(elemento('h3', medios[medio.tipo]), elemento('p', medio.referencia + (medio.principal ? ' · Predeterminado' : '')), acciones);
      lista.append(fila);
    }
  }

  formularioMedio.addEventListener('submit', evento => {
    evento.preventDefault();
    const actuales = leerMedios();
    const referencia = referenciaMedio.value;
    if (actuales.some(item => item.referencia === referencia && item.id !== editandoMedio)) {
      buscar('estado-medios').textContent = 'Esa referencia ya está guardada.';
      referenciaMedio.focus();
      return;
    }
    const nuevo = { id: editandoMedio ?? tienda.id(), tipo: tipoMedio.value, referencia, principal: principal.checked || !actuales.length };
    const siguientes = actuales.map(item => item.id === editandoMedio ? nuevo : { ...item, principal: !nuevo.principal && item.principal });
    if (!editandoMedio) siguientes.push(nuevo);
    if (guardar({ mediosPago: siguientes }, 'estado-medios', 'Medio de pago guardado.')) {
      actualizarMedios();
      cerrarMedio();
    }
  });

  const dialogo = buscar('confirmar-cuenta');
  let alConfirmar;
  function confirmar(titulo, texto, accion) {
    buscar('titulo-confirmar-cuenta').textContent = titulo;
    buscar('mensaje-confirmar-cuenta').textContent = texto;
    alConfirmar = accion;
    dialogo.returnValue = '';
    dialogo.showModal();
  }
  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'confirmar') alConfirmar();
  });

  buscar('estado-sesion').textContent = enSesion() ? 'Sesión de demostración activa' : 'Vista de demostración sin sesión';
  function salir() {
    try { sessionStorage.removeItem('jeruel_sesion_demo'); }
    catch { /* El modo local no requiere almacenamiento de sesión. */ }
    location.assign('index.html');
  }
  buscar('cerrar-sesion').addEventListener('click', salir);
  buscar('eliminar-cuenta').addEventListener('click', () => confirmar(
    'Eliminar cuenta local', 'Se borrarán tus datos, pedidos, favoritos, carrito y preferencias de este navegador.',
    () => {
      try {
        localStorage.setItem('jeruel_perfil', JSON.stringify({ pedidos: [] }));
        for (const clave of ['jeruel_favoritos', tienda.claveCarrito, 'jeruel_calificaciones']) localStorage.removeItem(clave);
        salir();
      } catch { buscar('estado-seguridad').textContent = 'No se pudieron borrar los datos locales.'; }
    }
  ));

  const dosPasos = buscar('verificacion');
  dosPasos.checked = Boolean(tienda.leerPerfil().dosPasos);
  dosPasos.addEventListener('change', () => {
    if (!guardar({ dosPasos: dosPasos.checked }, 'estado-seguridad', 'Preferencia guardada para esta demostración.')) dosPasos.checked = !dosPasos.checked;
  });
  const clave = buscar('clave-demo');
  const repetir = buscar('repetir-clave-demo');
  const formularioClave = buscar('formulario-clave');
  tienda.validar(formularioClave);
  formularioClave.addEventListener('input', () => {
    repetir.dataset.error = 'Las contraseñas de prueba deben coincidir.';
    repetir.setCustomValidity(repetir.value && repetir.value !== clave.value ? repetir.dataset.error : '');
  }, true);
  formularioClave.addEventListener('submit', evento => {
    evento.preventDefault();
    repetir.setCustomValidity('');
    formularioClave.reset();
    buscar('estado-seguridad').textContent = 'Cambio simulado. La contraseña de prueba se descartó.';
  });

  const preferencias = buscar('formulario-preferencias');
  for (const control of preferencias.elements) control.checked = Boolean(tienda.leerPerfil().preferencias?.[control.name]);
  preferencias.addEventListener('change', evento => {
    const control = evento.target;
    const valores = Object.fromEntries([...preferencias.elements].map(entrada => [entrada.name, entrada.checked]));
    if (!guardar({ preferencias: valores }, 'estado-preferencias', 'Preferencias actualizadas.')) control.checked = !control.checked;
  });

  const selectorSoporte = buscar('pedido-soporte');
  function actualizarSoporte() {
    const pedido = selectorSoporte.value;
    selectorSoporte.replaceChildren(new Option('Consulta general', ''));
    for (const entrada of tienda.pedidos()) selectorSoporte.add(new Option(entrada.id, entrada.id));
    if ([...selectorSoporte.options].some(opcion => opcion.value === pedido)) selectorSoporte.value = pedido;
  }
  const soporte = buscar('formulario-soporte');
  tienda.validar(soporte);
  soporte.addEventListener('submit', evento => {
    evento.preventDefault();
    const mensaje = buscar('mensaje-soporte').value.trim();
    if (mensaje.length < 10) {
      buscar('estado-soporte').textContent = 'Describe tu consulta en al menos 10 caracteres.';
      buscar('mensaje-soporte').focus();
      return;
    }
    const solicitudes = tienda.leerPerfil().solicitudes ?? [];
    const solicitud = { id: tienda.id(), pedido: selectorSoporte.value, mensaje };
    if (guardar({ solicitudes: [...solicitudes, solicitud] }, 'estado-soporte', 'Solicitud guardada en este navegador.')) soporte.reset();
  });

  function refrescarHistorial() {
    actualizarResumen();
    actualizarPedidos();
    actualizarSoporte();
    navegar();
  }
  window.addEventListener('pageshow', refrescarHistorial);
  window.addEventListener('storage', evento => {
    if (evento.key === 'jeruel_perfil' || evento.key === null) refrescarHistorial();
  });
  window.addEventListener('jeruel:perfil', actualizarResumen);
  actualizarFavoritos();
  actualizarMedios();
  refrescarHistorial();
})();
