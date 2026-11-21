(() => {
  'use strict';

  const tienda = window.Jeruel;
  const plantilla = document.createElement('template');
  plantilla.innerHTML = '<li class="fila-favorito"><a class="producto-favorito"><img width="64" height="64" alt=""><p class="datos-favorito"><strong></strong><small></small></p></a><button type="button" class="quitar-favorito">Quitar</button></li>';

  function mostrarFavoritos(contenedor) {
    const ids = tienda.favoritos();
    const lista = document.createElement('ul');
    lista.className = 'lista-favoritos';
    for (const id of ids) {
      const { nombre, imagen, precio } = tienda.productos.get(id);
      const fila = plantilla.content.cloneNode(true);
      const enlace = fila.querySelector('a');
      enlace.href = tienda.ficha(id);
      fila.querySelector('img').src = imagen;
      fila.querySelector('strong').textContent = nombre;
      fila.querySelector('small').textContent = tienda.precio(precio);
      if (contenedor.hasAttribute('data-permitir-compra')) {
        const agregar = document.createElement('button');
        agregar.type = 'button';
        agregar.className = 'boton primario';
        agregar.textContent = 'Agregar al carrito';
        agregar.setAttribute('aria-label', 'Agregar ' + nombre + ' al carrito');
        agregar.addEventListener('click', () => {
          const cantidad = tienda.agregarAlCarrito(id, 1);
          contenedor.querySelector('[role="status"]').textContent = cantidad === null
            ? 'El carrito no se pudo actualizar.'
            : cantidad ? nombre + ' se añadió al carrito.' : 'Alcanzaste el límite de unidades.';
        });
        fila.querySelector('li').append(agregar);
      }
      const quitar = fila.querySelector('button');
      quitar.setAttribute('aria-label', 'Quitar ' + nombre + ' de favoritos');
      quitar.addEventListener('click', () => {
        const posicion = [...lista.children].indexOf(quitar.closest('li'));
        if (tienda.alternarFavorito(id) === null) {
          contenedor.querySelector('[role="status"]').textContent = 'No se pudo quitar el producto. Revisa el almacenamiento del navegador.';
          return;
        }
        const botones = contenedor.querySelectorAll('.quitar-favorito');
        (botones[Math.min(posicion, botones.length - 1)] ?? contenedor.querySelector('a')).focus();
        contenedor.querySelector('[role="status"]').textContent = 'Producto quitado de favoritos.';
      });
      lista.append(fila);
    }
    const estado = document.createElement('p');
    estado.className = 'estado-favoritos';
    estado.setAttribute('role', 'status');
    if (ids.size) {
      contenedor.replaceChildren(lista, estado);
    } else {
      const vacio = document.createElement('p');
      vacio.className = 'favoritos-vacios';
      vacio.textContent = 'Todavía no has guardado velas.';
      const explorar = document.createElement('a');
      explorar.className = 'explorar-favoritos';
      explorar.href = 'homeScreen.html#catalogo';
      explorar.textContent = 'Explorar el catálogo';
      contenedor.replaceChildren(vacio, explorar, estado);
    }
  }

  const listas = document.querySelectorAll('[data-lista-favoritos]');
  const actualizar = () => listas.forEach(mostrarFavoritos);
  tienda.alCambiarFavoritos(actualizar);
  actualizar();
})();
