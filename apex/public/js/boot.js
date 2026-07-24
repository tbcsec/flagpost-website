/* Pre-paint boot. Loaded as a tiny blocking classic script in <head> so both
 * decisions land before first render — no flash of the wrong state, and no
 * inline script, so the CSP can stay `script-src 'self'`.
 *
 * 1. html[data-js] — gates the scroll-reveal CSS. Set only when
 *    IntersectionObserver exists, so content is never hidden for a browser
 *    (or a failed script) that could not reveal it again.
 * 2. html[data-plant] — the "Plant" logo entrance, once per session
 *    (LOGO-SPEC §11.2, `fp:mark-played` guard).
 */
(function () {
  try {
    var d = document.documentElement;
    if ("IntersectionObserver" in window) d.setAttribute("data-js", "");
    if (!sessionStorage.getItem("fp:mark-played")) {
      d.setAttribute("data-plant", "");
      sessionStorage.setItem("fp:mark-played", "1");
    }
  } catch (e) {
    /* Storage unavailable (e.g. blocked cookies): skip the animation. */
  }
})();
