// Google Analytics 4 — deferred until the browser is idle to avoid blocking FCP/LCP
function loadGA() {
  var s = document.createElement('script');
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-6NXF69ERP4';
  s.async = true;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-6NXF69ERP4');
}

if ('requestIdleCallback' in window) {
  requestIdleCallback(loadGA);
} else {
  setTimeout(loadGA, 3500);
}

// Activate non-blocking Google Fonts (CSP-safe alternative to inline onload handler)
var fontLink = document.querySelector('link[data-fonts]');
if (fontLink) fontLink.media = 'all';
