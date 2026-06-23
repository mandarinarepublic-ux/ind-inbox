let baseTitle = document.title;
let baseFavicon = null;
let pendientes = 0;

function getFaviconLink() {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
  return link;
}

function resetFavicon() { if (baseFavicon) getFaviconLink().href = baseFavicon; }

function favConPunto(count) {
  const link = getFaviconLink();
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  const pintarPunto = () => {
    const r = size * 0.3;
    ctx.beginPath(); ctx.arc(size - r, r, r, 0, Math.PI * 2);
    ctx.fillStyle = "#e02424"; ctx.fill();
    if (count > 0 && count < 100) {
      ctx.fillStyle = "#fff"; ctx.font = `bold ${r}px sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(count), size - r, r + 1);
    }
    link.href = canvas.toDataURL("image/png");
  };
  if (baseFavicon) {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, size, size); pintarPunto(); };
    img.onerror = pintarPunto;
    img.src = baseFavicon;
  } else { pintarPunto(); }
}

function render() {
  const oculto = document.visibilityState === "hidden";
  if (pendientes > 0 && oculto) { document.title = `(${pendientes}) ${baseTitle}`; favConPunto(pendientes); }
  else { document.title = baseTitle; resetFavicon(); }
  if ("setAppBadge" in navigator) {
    if (pendientes > 0) navigator.setAppBadge(pendientes).catch(() => {});
    else navigator.clearAppBadge().catch(() => {});
  }
}

export function actualizarNoLeidos(n) { pendientes = n || 0; render(); }

(function init() {
  baseFavicon = getFaviconLink().href || null;
  const alVolver = () => { pendientes = 0; render(); };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") alVolver(); else render(); });
  window.addEventListener("focus", alVolver);
})();
