(() => {
  'use strict';

  const buscar = id => document.getElementById(id);
  const clave = 'jeruel_perfil';
  const campos = ['nombre', 'correo', 'telefono'];

  const { leerPerfil } = window.Jeruel;

  function guardarPerfil(cambios, estado) {
    try {
      localStorage.setItem(clave, JSON.stringify({ ...leerPerfil(), ...cambios }));
      return true;
    } catch {
      estado.textContent = 'No se pudo guardar el cambio en este navegador.';
      return false;
    }
  }

  const enlaces = [...document.querySelectorAll('.menu-cuenta a[href^="#"]')];
  function marcarSeccion() {
    const activo = enlaces.find(enlace => enlace.hash === location.hash);
    enlaces.forEach(enlace => enlace.removeAttribute('aria-current'));
    activo?.setAttribute('aria-current', 'location');
  }
  window.addEventListener('hashchange', marcarSeccion);
  marcarSeccion();

  function actualizarDatos() {
    const { datos = {}, foto } = leerPerfil();
    campos.forEach(campo => { buscar('dato-' + campo).textContent = datos[campo] || 'Sin agregar'; });
    const nombre = buscar('nombre-cuenta');
    nombre.textContent = datos.nombre || '';
    nombre.hidden = !datos.nombre;
    const iniciales = buscar('iniciales');
    iniciales.textContent = datos.nombre?.split(/\s+/).slice(0, 2).map(parte => [...parte][0]).join('').toLocaleUpperCase('es') || 'J';
    iniciales.hidden = Boolean(foto);
    const imagen = buscar('foto-perfil');
    if (foto) imagen.src = foto;
    else imagen.removeAttribute('src');
    imagen.hidden = !foto;
  }

  const formularioDatos = buscar('formulario-datos');
  const editarDatos = buscar('editar-datos');
  const estadoDatos = buscar('estado-datos');
  function cerrarEdicionDatos() {
    formularioDatos.hidden = true;
    buscar('datos-guardados').hidden = false;
    editarDatos.hidden = false;
    editarDatos.focus();
  }
  editarDatos.addEventListener('click', () => {
    const { datos = {} } = leerPerfil();
    campos.forEach(campo => { formularioDatos.elements[campo].value = datos[campo] || ''; });
    estadoDatos.textContent = '';
    editarDatos.hidden = true;
    buscar('datos-guardados').hidden = true;
    formularioDatos.hidden = false;
    buscar('nombre').focus();
  });
  buscar('cancelar-datos').addEventListener('click', cerrarEdicionDatos);
  formularioDatos.addEventListener('submit', evento => {
    evento.preventDefault();
    const datos = Object.fromEntries(campos.map(campo => [campo, formularioDatos.elements[campo].value.trim()]));
    if (!datos.nombre) {
      estadoDatos.textContent = 'Escribe tu nombre para guardar los cambios.';
      buscar('nombre').focus();
      return;
    }
    if (!guardarPerfil({ datos }, estadoDatos)) return;
    actualizarDatos();
    cerrarEdicionDatos();
    estadoDatos.textContent = 'Datos personales actualizados.';
  });

  const dialogo = buscar('dialogo-foto');
  const archivo = buscar('archivo-foto');
  const vista = buscar('vista-foto');
  const estadoFoto = buscar('estado-foto');
  const errorFoto = buscar('error-foto');
  const guardarFoto = buscar('guardar-foto');
  let fotoPendiente = '';
  let seleccion = 0;

  buscar('cambiar-foto').addEventListener('click', () => {
    const { foto } = leerPerfil();
    vista.hidden = !foto;
    if (foto) vista.src = foto;
    buscar('quitar-foto').hidden = !foto;
    dialogo.showModal();
  });

  archivo.addEventListener('change', async () => {
    const actual = ++seleccion;
    const foto = archivo.files[0];
    fotoPendiente = '';
    guardarFoto.disabled = true;
    errorFoto.textContent = '';
    vista.hidden = true;
    if (!foto) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(foto.type) || foto.size > 5 * 1024 * 1024) {
      errorFoto.textContent = 'Selecciona un archivo JPG, PNG o WebP de hasta 5 MB.';
      return;
    }
    try {
      const imagen = await createImageBitmap(foto);
      const escala = Math.min(1, 360 / Math.max(imagen.width, imagen.height));
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.max(1, Math.round(imagen.width * escala));
      lienzo.height = Math.max(1, Math.round(imagen.height * escala));
      lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      imagen.close();
      if (actual !== seleccion) return;
      fotoPendiente = lienzo.toDataURL('image/webp', .85);
      vista.src = fotoPendiente;
      vista.hidden = false;
      guardarFoto.disabled = false;
    } catch {
      if (actual === seleccion) errorFoto.textContent = 'La imagen no se pudo abrir. Selecciona otro archivo.';
    }
  });

  function actualizarFoto(foto, mensaje) {
    if (!guardarPerfil({ foto }, errorFoto)) return;
    actualizarDatos();
    dialogo.close();
    estadoFoto.textContent = mensaje;
  }
  buscar('formulario-foto').addEventListener('submit', evento => {
    evento.preventDefault();
    if (fotoPendiente) actualizarFoto(fotoPendiente, 'Foto de perfil actualizada.');
  });
  buscar('quitar-foto').addEventListener('click', () => actualizarFoto('', 'Foto de perfil quitada.'));
  buscar('cancelar-foto').addEventListener('click', () => dialogo.close());
  dialogo.addEventListener('close', () => {
    seleccion++;
    fotoPendiente = '';
    archivo.value = '';
    vista.removeAttribute('src');
    errorFoto.textContent = '';
    guardarFoto.disabled = true;
    buscar('cambiar-foto').focus();
  });

  const formularioDireccion = buscar('formulario-direccion');
  const departamento = buscar('departamento');
  const ciudad = buscar('ciudad');
  const ubicaciones = new Map(Object.entries(window.divipolaColombia));
  const ordenarNombre = (a, b) => a[1].localeCompare(b[1], 'es');
  const normalizarLugar = nombre => String(nombre ?? '').normalize('NFD')
    .replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();

  const departamentos = [...ubicaciones].map(([codigo, [nombre]]) => [codigo, nombre]);
  for (const [codigo, nombre] of departamentos.sort(ordenarNombre)) {
    departamento.add(new Option(nombre, codigo));
  }

  function mostrarMunicipios(codigoDepartamento, codigoMunicipio = '') {
    const municipios = ubicaciones.get(codigoDepartamento)?.[1];
    ciudad.disabled = !municipios;
    ciudad.replaceChildren(new Option(municipios ? 'Selecciona una ciudad o municipio' : 'Selecciona primero el departamento', ''));
    if (!municipios) return;
    for (const [codigo, nombre] of Object.entries(municipios).sort(ordenarNombre)) {
      ciudad.add(new Option(nombre, codigo));
    }
    ciudad.value = Object.hasOwn(municipios, codigoMunicipio) ? codigoMunicipio : '';
  }

  function ubicacionGuardada(entrada) {
    if (!entrada) return [];
    if (ubicaciones.has(entrada.codigoDepartamento)) return [entrada.codigoDepartamento, entrada.codigoMunicipio];

    const nombreDepartamento = normalizarLugar(entrada.departamento ?? entrada.Departamento);
    const nombreMunicipio = normalizarLugar(entrada.ciudad);
    const coincidencias = [];
    for (const [codigoDepartamento, [nombre, municipios]] of ubicaciones) {
      if (nombreDepartamento && normalizarLugar(nombre) !== nombreDepartamento) continue;
      for (const [codigoMunicipio, municipio] of Object.entries(municipios)) {
        const [nombreCorto] = municipio.split(' - ');
        if (nombreMunicipio && [municipio, nombreCorto].some(lugar => normalizarLugar(lugar) === nombreMunicipio)) {
          coincidencias.push([codigoDepartamento, codigoMunicipio]);
        }
      }
    }
    if (coincidencias.length === 1) return coincidencias[0];
    return [departamentos.find(([, nombre]) => normalizarLugar(nombre) === nombreDepartamento)?.[0]];
  }

  departamento.addEventListener('change', () => mostrarMunicipios(departamento.value));
  const agregarDireccion = buscar('agregar-direccion');
  const listaDirecciones = buscar('direcciones-guardadas');
  const estadoDirecciones = buscar('estado-direcciones');
  let idEdicion;
  let origenEdicion;
  const leerDirecciones = () => leerPerfil().direcciones ?? [];

  function botonDireccion(texto, etiqueta, accion) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton secundario';
    boton.textContent = texto;
    boton.setAttribute('aria-label', etiqueta);
    boton.addEventListener('click', accion);
    return boton;
  }

  function actualizarDirecciones() {
    const direcciones = leerDirecciones();
    listaDirecciones.replaceChildren();
    listaDirecciones.hidden = !direcciones.length;
    buscar('direcciones-vacias').hidden = Boolean(direcciones.length);

    for (const entrada of direcciones) {
      const tarjeta = document.createElement('li');
      tarjeta.className = 'direccion-guardada';
      const titulo = document.createElement('h3');
      titulo.textContent = entrada.principal ? 'Dirección principal' : entrada.ciudad;
      const texto = document.createElement('p');
      texto.textContent = [entrada.direccion, entrada.ciudad, entrada.departamento].filter(Boolean).join(', ');
      const acciones = document.createElement('p');
      acciones.className = 'acciones';
      acciones.append(botonDireccion('Editar', 'Editar ' + entrada.direccion, evento => {
        abrirDireccion(entrada, evento.currentTarget);
      }));
      if (!entrada.principal) {
        acciones.append(botonDireccion('Hacer principal', 'Hacer principal ' + entrada.direccion, () => {
          const nuevas = leerDirecciones().map(direccion => ({ ...direccion, principal: direccion.id === entrada.id }));
          if (guardarPerfil({ direcciones: nuevas }, estadoDirecciones)) {
            actualizarDirecciones();
            agregarDireccion.focus();
            estadoDirecciones.textContent = 'Dirección principal actualizada.';
          }
        }));
      }
      acciones.append(botonDireccion('Quitar', 'Quitar ' + entrada.direccion, () => {
        if (!window.confirm('¿Quitar esta dirección de tu perfil?')) return;
        const nuevas = leerDirecciones().filter(direccion => direccion.id !== entrada.id);
        if (nuevas.length && !nuevas.some(direccion => direccion.principal)) nuevas[0].principal = true;
        if (guardarPerfil({ direcciones: nuevas }, estadoDirecciones)) {
          actualizarDirecciones();
          agregarDireccion.focus();
          estadoDirecciones.textContent = 'Dirección quitada.';
        }
      }));
      tarjeta.append(titulo, texto, acciones);
      listaDirecciones.append(tarjeta);
    }
  }

  function abrirDireccion(entrada, origen) {
    idEdicion = entrada?.id;
    origenEdicion = origen;
    formularioDireccion.elements.direccion.value = entrada?.direccion ?? '';
    const [codigoDepartamento = '', codigoMunicipio = ''] = ubicacionGuardada(entrada);
    departamento.value = codigoDepartamento;
    mostrarMunicipios(codigoDepartamento, codigoMunicipio);
    const principal = formularioDireccion.elements.principal;
    principal.checked = entrada?.principal || leerDirecciones().length === 0;
    principal.disabled = principal.checked;
    estadoDirecciones.textContent = '';
    listaDirecciones.hidden = true;
    buscar('direcciones-vacias').hidden = true;
    agregarDireccion.hidden = true;
    formularioDireccion.hidden = false;
    buscar('direccion').focus();
  }
  function cerrarDireccion(enfocar) {
    formularioDireccion.hidden = true;
    const tieneDirecciones = listaDirecciones.childElementCount > 0;
    listaDirecciones.hidden = !tieneDirecciones;
    buscar('direcciones-vacias').hidden = tieneDirecciones;
    agregarDireccion.hidden = false;
    (enfocar?.isConnected ? enfocar : agregarDireccion).focus();
  }
  agregarDireccion.addEventListener('click', () => abrirDireccion(null, agregarDireccion));
  buscar('cancelar-direccion').addEventListener('click', () => cerrarDireccion(origenEdicion));
  formularioDireccion.addEventListener('submit', evento => {
    evento.preventDefault();
    const camposDireccion = formularioDireccion.elements;
    const direccion = camposDireccion.direccion.value.trim();
    const codigoDepartamento = departamento.value;
    const codigoMunicipio = ciudad.value;
    const ubicacion = ubicaciones.get(codigoDepartamento);
    const municipio = ubicacion && Object.hasOwn(ubicacion[1], codigoMunicipio) ? ubicacion[1][codigoMunicipio] : '';
    if (!direccion || !municipio) {
      estadoDirecciones.textContent = 'Completa la dirección, el departamento y la ciudad o municipio.';
      if (!direccion) buscar('direccion').focus();
      else (ubicacion ? ciudad : departamento).focus();
      return;
    }

    const direcciones = leerDirecciones();
    const id = idEdicion ?? String(crypto.getRandomValues(new Uint32Array(2)).join('-'));
    const principal = camposDireccion.principal.checked || !direcciones.length;
    const entrada = { id, direccion, departamento: ubicacion[0], ciudad: municipio, codigoDepartamento, codigoMunicipio, principal };
    const nuevas = direcciones.map(item => item.id === id ? entrada : { ...item, principal: !principal && item.principal });
    if (!nuevas.some(item => item.id === id)) nuevas.push(entrada);
    if (!guardarPerfil({ direcciones: nuevas }, estadoDirecciones)) return;
    actualizarDirecciones();
    cerrarDireccion(agregarDireccion);
    estadoDirecciones.textContent = 'Dirección guardada.';
  });

  actualizarDatos();
  actualizarDirecciones();
})();
