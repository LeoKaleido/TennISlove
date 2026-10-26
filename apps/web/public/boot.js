// Schermata di avvio: il cuore sfuma dentro solo quando l'immagine è caricata, non prima.
// File separato perché la Content-Security-Policy non permette script dentro l'HTML.
(function () {
  var img = document.querySelector('#boot img');
  if (!img) return;
  var show = function () {
    img.classList.add('in');
  };
  if (img.complete) show();
  else img.addEventListener('load', show);
})();
