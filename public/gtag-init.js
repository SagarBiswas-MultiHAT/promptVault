// Google Analytics 4 — deferred until after first user interaction or idle timeout
// to prevent third-party scripts from competing with LCP and main-thread hydration.
function loadGA() {
  if (window.__gaLoaded) return;
  window.__gaLoaded = true;

  // Cleanup interaction listeners once loaded
  ['pointerdown', 'touchstart', 'scroll', 'keydown'].forEach(function (e) {
    window.removeEventListener(e, loadGA, { passive: true });
  });

  var s = document.createElement('script');
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-6NXF69ERP4';
  s.async = true;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-6NXF69ERP4');
}

// Attach user interaction listeners with passive flag for zero scroll jank
['pointerdown', 'touchstart', 'scroll', 'keydown'].forEach(function (e) {
  window.addEventListener(e, loadGA, { once: true, passive: true });
});

// Fallback idle timer after 4.5 seconds if no interaction occurs
if ('requestIdleCallback' in window) {
  setTimeout(function() { requestIdleCallback(loadGA); }, 4500);
} else {
  setTimeout(loadGA, 4500);
}

// Activate non-blocking Google Fonts (CSP-safe alternative to inline onload handler)
var fontLink = document.querySelector('link[data-fonts]');
if (fontLink) fontLink.media = 'all';
