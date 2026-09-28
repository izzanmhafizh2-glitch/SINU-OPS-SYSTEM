// ===================== SPLASH INTRO — PT SINu =====================
// Menampilkan animasi pembuka logo S (wave reveal + glint + wordmark),
// dengan latar yang menyesuaikan tema terang / gelap, lalu transisi
// sekali jalan ke aplikasi.

(function () {
  var splash = document.getElementById('sinu-splash');
  if (!splash) return;

  // Tentukan tema seperti initTheme(): localStorage 'dark' atau preferensi sistem.
  try {
    var saved = localStorage.getItem('theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = saved === 'dark' || (!saved && prefersDark);
    if (isDark) splash.classList.add('is-dark');
  } catch (e) { /* abaikan, default tema terang */ }

  var splashLogo = splash.querySelector('.sinu-splash-logo');
  var hidden = false;
  var introStarted = false;
  var hideScheduled = false;

  function hideSinuSplash() {
    if (hidden) return;
    hidden = true;
    splash.classList.add('is-leaving');
    setTimeout(function () { if (splash.parentNode) splash.remove(); }, 650);
  }

  // Mulai timer keluar hanya setelah animasi benar-benar sudah dimulai.
  // Timeline CSS berakhir sekitar 3.75 detik setelah play; beri jeda
  // tambahan agar wordmark tidak ikut terpotong saat splash menghilang.
  function scheduleHide() {
    if (!introStarted || hideScheduled) return;
    hideScheduled = true;
    setTimeout(hideSinuSplash, 4600);
  }

  function startIntro() {
    if (introStarted || hidden) return;
    introStarted = true;
    splash.classList.add('play');
    // Jangan izinkan wordmark terlihat sebelum logo dan garis selesai.
    setTimeout(function () {
      if (!hidden) splash.classList.add('wordmark-ready');
    }, 2850);
    scheduleHide();
  }

  function startWhenLogoReady() {
    if (!splashLogo) {
      startIntro();
      return;
    }

    function logoReady() {
      if (typeof splashLogo.decode !== 'function') {
        startIntro();
        return;
      }
      splashLogo.decode().then(startIntro).catch(startIntro);
    }

    if (splashLogo.complete) {
      // naturalWidth memastikan cache yang gagal tidak dianggap siap.
      if (splashLogo.naturalWidth > 0) logoReady();
      else startIntro();
      return;
    }

    splashLogo.addEventListener('load', logoReady, { once: true });
    splashLogo.addEventListener('error', startIntro, { once: true });
  }

  // Jangan biarkan halaman terkunci jika resource eksternal bermasalah.
  // Pada jalur normal, timer keluar sudah dijadwalkan setelah PNG siap.
  setTimeout(function () {
    if (!introStarted) {
      hideSinuSplash();
    } else {
      scheduleHide();
    }
  }, 8000);

  // PNG harus siap terlebih dahulu; setelah itu barulah seluruh timeline CSS
  // (logo, garis, lalu wordmark) dimulai dari titik yang sama.
  startWhenLogoReady();
})();
