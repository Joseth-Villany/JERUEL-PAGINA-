(() => {
  'use strict';

  const movimiento = matchMedia('(prefers-reduced-motion: reduce)');
  if (movimiento.matches || !('IntersectionObserver' in window)) return;

  const observador = new IntersectionObserver(entradas => {
    for (const entrada of entradas) {
      if (!entrada.isIntersecting) continue;
      observador.unobserve(entrada.target);
      if (!movimiento.matches) entrada.target.classList.add('revelado');
    }
  });

  for (const bloque of document.querySelectorAll('[data-revelar]')) {
    const posicion = bloque.getBoundingClientRect();
    if (!posicion.height || posicion.top >= innerHeight || posicion.bottom <= 0) {
      observador.observe(bloque);
    }
  }
})();
