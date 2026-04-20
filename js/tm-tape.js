// tm-tape.js — tape rendering

var CELL_W = 49; // cell width + gap in px
var PAD    = 5;  // blank padding cells on each side

function renderTape(tape, headPos, prevHead) {
  var container = document.getElementById('tape-cells');
  if (!container) return;

  var start = Math.max(0, headPos - PAD);
  var end   = Math.max(tape.length - 1, headPos) + PAD;

  container.innerHTML = '';
  for (var i = start; i <= end; i++) {
    var sym   = tape[i] !== undefined ? tape[i] : 'B';
    var blank = (sym === 'B');
    var isHead  = (i === headPos);
    var wasHead = (i === prevHead && i !== headPos);

    var div = document.createElement('div');
    div.className = 'tcell' +
      (blank   ? ' blank' : '') +
      (isHead  ? ' head'  : '') +
      (wasHead ? ' flash' : '');
    div.textContent = blank ? 'B' : sym;
    container.appendChild(div);
  }

  // Position head pointer
  var ptr = document.getElementById('head-ptr');
  if (ptr) {
    var rel  = headPos - start;
    var left = rel * CELL_W + 12;
    ptr.style.left = left + 'px';
  }

  // Scroll so head is visible
  var scroll = document.getElementById('tape-scroll');
  if (scroll) {
    var rel2   = headPos - start;
    var cellL  = rel2 * CELL_W + 12;
    var center = cellL - scroll.clientWidth / 2 + CELL_W / 2;
    scroll.scrollTo({ left: Math.max(0, center), behavior: 'smooth' });
  }
}

function flashHead() {
  var h = document.querySelector('.tcell.head');
  if (!h) return;
  h.classList.remove('flash');
  void h.offsetWidth;
  h.classList.add('flash');
}
