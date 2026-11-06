/** Runs only after a confirmed mutation. The returned cleanup is safe to call on navigation. */
export function animateCartTransfer(origin: HTMLElement, destination: HTMLElement, arrived: () => void): (() => void) | undefined {
  const document = origin.ownerDocument;
  const viewport = document.defaultView;
  if (!viewport || typeof origin.animate !== 'function' ||
    viewport.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const from = origin.getBoundingClientRect();
  const to = destination.getBoundingClientRect();
  const x = from.left + from.width / 2;
  const y = from.top + from.height / 2;
  const dx = to.left + to.width / 2 - x;
  const dy = to.top + to.height / 2 - y;
  if (!from.width || !from.height || !to.width || !to.height ||
    x < 0 || y < 0 || x > viewport.innerWidth || y > viewport.innerHeight) return;

  const token = document.createElement('span');
  token.setAttribute('aria-hidden', 'true');
  token.dataset['cartTransfer'] = '';
  Object.assign(token.style, {
    position: 'fixed', inset: '0 auto auto 0', zIndex: '1000', pointerEvents: 'none',
    inlineSize: '22px', blockSize: '22px', border: '2px solid var(--cmc-primary)',
    borderRadius: 'var(--cmc-radius-md)', background: 'var(--cmc-promo-mamey)',
    left: `${x - 11}px`, top: `${y - 11}px`,
  });
  document.body.append(token);
  const animation = token.animate([
    { transform: 'translate(0, 0) scale(1)' },
    { transform: `translate(${dx * .4}px, ${dy * .6 - 18}px) scale(.9)`, offset: .55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.45)`, opacity: 0 },
  ], { duration: 420, easing: 'ease-in-out' });

  const cleanup = () => {
    viewport.removeEventListener('resize', cleanup);
    document.removeEventListener('scroll', cleanup, true);
    animation.onfinish = null;
    animation.cancel();
    token.remove();
  };
  animation.onfinish = () => { cleanup(); arrived(); };
  viewport.addEventListener('resize', cleanup, { once: true });
  document.addEventListener('scroll', cleanup, { capture: true, once: true });
  return cleanup;
}
