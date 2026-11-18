/* Clean shareable portfolio/project links without changing page content.
   Referrer/utm tags are added by external apps; they aren't author credits. */
(function () {
  "use strict";
  try {
    var u = new URL(window.location.href);
    var changed = false;
    Array.from(u.searchParams.keys()).forEach(function (key) {
      var k = key.toLowerCase();
      if (k.indexOf("utm_") === 0 || k === "v" ||
          k === "gclid" || k === "fbclid" ||
          k === "mc_cid" || k === "mc_eid") {
        u.searchParams.delete(key);
        changed = true;
      }
    });
    if (changed && window.history && typeof window.history.replaceState === "function") {
      window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash);
    }
  } catch (err) {
    // Browser-history editing is optional; the application still works.
  }
})();
