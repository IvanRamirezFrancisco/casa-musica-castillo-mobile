import { animateCartTransfer } from './cart-transfer';

describe('trayectoria confirmada del carrito', () => {
  afterEach(() => vi.restoreAllMocks());

  function elements() {
    const origin = document.createElement('button');
    const destination = document.createElement('a');
    vi.spyOn(origin, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 100, 200, 48));
    vi.spyOn(destination, 'getBoundingClientRect').mockReturnValue(new DOMRect(220, 20, 44, 44));
    const animation = { onfinish: null as (() => void) | null, cancel: vi.fn() };
    const animate = vi.fn(() => animation);
    const previous = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate');
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    const restore = () => {
      if (previous) Object.defineProperty(HTMLElement.prototype, 'animate', previous);
      else Reflect.deleteProperty(HTMLElement.prototype, 'animate');
    };
    return { origin, destination, animation, animate, restore };
  }

  it('calcula el destino con los rectángulos, anima y retira la ficha antes de notificar la llegada', () => {
    const { origin, destination, animation, animate, restore } = elements();
    const arrived = vi.fn();
    try {
      const cleanup = animateCartTransfer(origin, destination, arrived);
      expect(cleanup).toBeTypeOf('function');
      expect(animate).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ transform: 'translate(102px, -82px) scale(.45)' }),
      ]), expect.objectContaining({ duration: 420 }));
      expect(document.querySelector('[data-cart-transfer]')).not.toBeNull();
      animation.onfinish?.();
      expect(arrived).toHaveBeenCalledTimes(1);
      expect(document.querySelector('[data-cart-transfer]')).toBeNull();
    } finally { restore(); }
  });

  it('cancela al redimensionar y omite la trayectoria con movimiento reducido', () => {
    const { origin, destination, animate, restore } = elements();
    const arrived = vi.fn();
    try {
      animateCartTransfer(origin, destination, arrived);
      window.dispatchEvent(new Event('resize'));
      expect(document.querySelector('[data-cart-transfer]')).toBeNull();
      expect(arrived).not.toHaveBeenCalled();
      const old = Object.getOwnPropertyDescriptor(window, 'matchMedia');
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: true }) });
      try {
        expect(animateCartTransfer(origin, destination, arrived)).toBeUndefined();
        expect(animate).toHaveBeenCalledTimes(1);
      } finally {
        if (old) Object.defineProperty(window, 'matchMedia', old);
        else Reflect.deleteProperty(window, 'matchMedia');
      }
    } finally { restore(); }
  });
});
