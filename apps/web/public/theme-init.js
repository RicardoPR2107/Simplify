// Aplica el tema guardado antes de pintar, para evitar un parpadeo claro → oscuro.
// Vive en un archivo aparte (no dentro del HTML) para que la política de seguridad (CSP)
// pueda prohibir todo script en línea.
try {
  const saved = localStorage.getItem('simplify-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) document.documentElement.classList.add('dark');
} catch {
  // Sin acceso a localStorage: se usa el tema claro.
}
