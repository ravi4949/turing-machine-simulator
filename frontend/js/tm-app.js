// tm-app.js — Main Application Controller
// All onclick functions are assigned to window so HTML can call them.

(function() {

  // ── App state ──────────────────────────────────────────────────────────────
  var machines     = [];
  var curMachine   = null;
  var prevHead     = 0;
  var curGraphDef  = null;
  var logCollapsed = false;

  // ── Particles (landing page bg) ────────────────────────────────────────────
  function initParticles() {
    var c = document.getElementById('particle-canvas');
    if (!c) return;
    var ctx = c.getContext('2d');
    var W, H, pts = [];

    function resize() {
      W = c.width  = c.parentElement.clientWidth  || 800;
      H = c.height = c.parentElement.clientHeight || 600;
    }

    function rnd() {
      return { x: Math.random()*(W||800), y: Math.random()*(H||600),
               ch: Math.random()<.5?'0':'1', sp: .12+Math.random()*.28,
               op: .04+Math.random()*.1,   sz: 10+Math.random()*14 };
    }

    function draw() {
      ctx.clearRect(0,0,W,H);
      ctx.strokeStyle='rgba(0,229,255,.025)'; ctx.lineWidth=1;
      for(var x=0;x<W;x+=60){ ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke(); }
      for(var y=0;y<H;y+=60){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke(); }
      pts.forEach(function(p){
        ctx.font=p.sz+'px Space Mono,monospace';
        ctx.fillStyle='rgba(0,229,255,'+p.op+')';
        ctx.fillText(p.ch,p.x,p.y);
        p.y-=p.sp;
        if(p.y<-20){p.y=H+20;p.x=Math.random()*W;p.ch=Math.random()<.5?'0':'1';}
      });
      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    for(var i=0;i<55;i++) pts.push(rnd());
    draw();
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function navigate(pageId) {
    document.querySelectorAll('.page').forEach(function(p) {
      p.classList.remove('active');
      p.style.display = 'none';
    });
    var target = document.getElementById(pageId);
    if (!target) return;
    target.style.display = 'block';
    void target.offsetWidth;
    target.classList.add('active');
    if (pageId === 'page-select') loadMachineCards();
  }

  // ── Machine cards ───────────────────────────────────────────────────────────
  function loadMachineCards() {
    if (machines.length > 0) { renderCards(machines); return; }
    apiFetchMachines().then(function(list) {
      machines = list;
      renderCards(list);
    }).catch(function(e) {
      var el = document.getElementById('machine-cards');
      if (el) el.innerHTML = '<div style="color:#ff4466;padding:1.5rem;font-family:monospace">Error loading machines: ' + e.message + '<br>Make sure the server is running (node server.js)</div>';
    });
  }

  function renderCards(list) {
    var container = document.getElementById('machine-cards');
    if (!container) return;
    container.innerHTML = '';

    // Add Custom Machine Card
    var customCard = document.createElement('div');
    customCard.className = 'mcard';
    customCard.style.borderColor = 'var(--cyan)';
    customCard.innerHTML =
      '<div class="mcard-num">Custom</div>'+
      '<h3>Create Custom Machine</h3>'+
      '<p>Define your own states, alphabet, and transitions from scratch.</p>'+
      '<div class="mcard-cta" style="margin-top: 10px;">Build Machine →</div>';
    customCard.addEventListener('click', function() { navigate('page-build'); });
    container.appendChild(customCard);

    list.forEach(function(m, i) {
      var card = document.createElement('div');
      card.className = 'mcard';
      card.innerHTML =
        '<div class="mcard-num">Machine 0'+(i+1)+'</div>'+
        '<h3>'+m.name+'</h3>'+
        '<p>'+m.description+'</p>'+
        '<div class="mcard-hint">'+m.inputHint+'</div>'+
        '<div class="mcard-examples">'+
          m.examples.map(function(ex){
            return '<span class="ex-chip">'+ex+'</span>';
          }).join('')+
        '</div>'+
        '<div class="mcard-cta">Select Machine →</div>';

      // Click chip → select machine and fill example
      card.querySelectorAll('.ex-chip').forEach(function(chip) {
        chip.addEventListener('click', function(e) {
          e.stopPropagation();
          selectMachine(m, chip.textContent);
        });
      });
      card.addEventListener('click', function() { selectMachine(m, ''); });
      container.appendChild(card);
    });
  }

  // ── Select machine ──────────────────────────────────────────────────────────
  function selectMachine(m, prefill) {
    curMachine = m;
    navigate('page-sim');

    var badge = document.getElementById('machine-badge');
    if (badge) badge.textContent = m.name;

    tmReset();

    // Fill example chips in sim panel
    var chipRow = document.getElementById('example-chips');
    if (chipRow) {
      chipRow.innerHTML = (m.examples || []).map(function(ex) {
        return '<span class="chip" onclick="tmUseExample(\''+ex+'\')">'+ex+'</span>';
      }).join('');
    }

    // Prefill input if chip was clicked
    if (prefill) {
      var inp = document.getElementById('input-string');
      if (inp) inp.value = prefill;
    }

    // Load and draw graph
    if (m.id === 'custom') {
      curGraphDef = m.graphDef;
      setTimeout(function() {
        drawGraph('graph-container', m.graphDef);
        setTimeout(function() {
          if (typeof highlightState === 'function') highlightState(m.graphDef.startState);
        }, 300);
      }, 150);
    } else {
      apiFetchGraph(m.id).then(function(def) {
        curGraphDef = def;
        // Delay so the container is visible and has size
        setTimeout(function() {
          drawGraph('graph-container', def);
          setTimeout(function() {
            if (typeof highlightState === 'function') highlightState(def.startState);
          }, 300);
        }, 150);
      }).catch(function(e) {
        console.error('Graph error:', e.message);
      });
    }
  }

  // ── Use example ─────────────────────────────────────────────────────────────
  function tmUseExample(val) {
    var inp = document.getElementById('input-string');
    var err = document.getElementById('input-error');
    if (inp) { inp.value = val; inp.style.borderColor = ''; }
    if (err) err.textContent = '';
  }

  // ── Handle Check String ─────────────────────────────────────────────────────
  function handleCheck() {
    var inp = document.getElementById('input-string');
    var err = document.getElementById('input-error');
    var val = inp ? inp.value.trim() : '';

    var v = validateBinaryInput(val);
    if (!v.ok) {
      if (err) err.textContent = v.err;
      if (inp) inp.style.borderColor = '#ff4466';
      return;
    }
    if (err) err.textContent = '';
    if (inp) inp.style.borderColor = '';

    if (!curMachine) { if (err) err.textContent = 'Please select a machine first.'; return; }

    var btn = document.getElementById('check-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Running…'; }

    runSimulation(curMachine.id, val, curMachine.customDef)
      .then(function() {
        showSimBlocks();
        renderStep(false);
      })
      .catch(function(e) {
        if (err) err.textContent = 'Error: ' + e.message;
        if (inp) inp.style.borderColor = '#ff4466';
      })
      .finally(function() {
        if (btn) { btn.disabled = false; btn.textContent = 'Check String'; }
      });
  }

  // ── Show simulation blocks ──────────────────────────────────────────────────
  function showSimBlocks() {
    ['tape-block','trans-block','ctrl-block','log-block'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = '';
    });
    var rb = document.getElementById('result-banner');
    if (rb) rb.style.display = 'none';
    buildLog();
    refreshButtons();
  }

  // ── Render step ─────────────────────────────────────────────────────────────
  function renderStep(animate) {
    var cfg = TM.current();
    if (!cfg) return;

    // Tape
    renderTape(cfg.tape, cfg.headPos, prevHead);
    if (animate) flashHead();
    prevHead = cfg.headPos;

    // Step counter
    var sc = document.getElementById('step-counter');
    if (sc) sc.textContent = 'Step ' + cfg.step;

    // Transition info
    setText('trans-formula', cfg.transitionStr  || '—');
    setText('lbl-state',     cfg.state          || '—');
    setText('lbl-read',      cfg.readSymbol    != null ? cfg.readSymbol    : '—');
    setText('lbl-write',     cfg.writtenSymbol != null ? cfg.writtenSymbol : '—');
    setText('lbl-dir',       cfg.direction      || '—');

    // Graph highlight
    if (typeof highlightState === 'function') highlightState(cfg.state);

    // Log highlight
    document.querySelectorAll('.log-row').forEach(function(el) { el.classList.remove('cur'); });
    var cur = document.querySelector('.log-row[data-step="'+cfg.step+'"]');
    if (cur) { cur.classList.add('cur'); cur.scrollIntoView({block:'nearest',behavior:'smooth'}); }

    // Show result if terminal
    if (cfg.state === 'q_accept' || cfg.state === 'q_reject') {
      showResult(cfg.state === 'q_accept');
    }

    refreshButtons();
  }

  // ── Log ─────────────────────────────────────────────────────────────────────
  function buildLog() {
    var log = document.getElementById('history-log');
    if (!log) return;
    log.innerHTML = '';
    TM.history.forEach(function(cfg) {
      var acc = cfg.state === 'q_accept';
      var rej = cfg.state === 'q_reject';
      var row = document.createElement('div');
      row.className = 'log-row' + (acc?' acc':'') + (rej?' rej':'');
      row.dataset.step = cfg.step;
      row.innerHTML =
        '<span class="log-num">#'+String(cfg.step).padStart(3,'0')+'</span>'+
        '<span class="log-state">'+cfg.state+'</span>'+
        '<span class="log-tr">'+(cfg.transitionStr||'')+'</span>';
      row.addEventListener('click', function() {
        engineStopPlay();
        engineGoToStep(cfg.step);
        renderStep(true);
      });
      log.appendChild(row);
    });
  }

  function tmToggleLog() {
    logCollapsed = !logCollapsed;
    var log = document.getElementById('history-log');
    var btn = document.querySelector('#log-block .icon-btn');
    if (log) log.style.display = logCollapsed ? 'none' : '';
    if (btn) btn.textContent   = logCollapsed ? '▶' : '▼';
  }

  // ── Step controls ────────────────────────────────────────────────────────────
  // Named tmStepForward / tmStepBack to avoid any conflict with engine functions
  function tmStepForward() {
    engineStopPlay();
    var cfg = engineStepForward();
    if (cfg) renderStep(true);
  }

  function tmStepBack() {
    engineStopPlay();
    var cfg = engineStepBack();
    if (cfg) renderStep(false);
  }

  function tmTogglePlay() {
    if (TM.isPlaying) {
      engineStopPlay();
      refreshButtons();
      return;
    }
    var spd = parseInt((document.getElementById('speed-slider')||{value:'5'}).value)||5;
    engineStartPlay(
      function() { renderStep(true); },
      function() { refreshButtons(); },
      spd
    );
    refreshButtons();
  }

  function tmReset() {
    engineStopPlay();
    TM.reset();
    prevHead = 0;

    ['tape-block','trans-block','ctrl-block','log-block'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    var rb = document.getElementById('result-banner');
    if (rb) rb.style.display = 'none';

    var inp = document.getElementById('input-string');
    if (inp) { inp.value = ''; inp.style.borderColor = ''; }
    var err = document.getElementById('input-error');
    if (err) err.textContent = '';

    if (curGraphDef && typeof highlightState === 'function') {
      highlightState(curGraphDef.startState);
    }
  }

  // ── Result banner ────────────────────────────────────────────────────────────
  function showResult(accepted) {
    var banner = document.getElementById('result-banner');
    var icon   = document.getElementById('res-icon');
    var text   = document.getElementById('res-text');
    var sub    = document.getElementById('res-sub');
    if (!banner) return;

    var tape  = (TM.result && TM.result.finalTape) ? TM.result.finalTape.join('') : '';
    var steps = TM.result ? TM.result.steps : 0;

    banner.style.display = '';
    icon.textContent     = accepted ? '✅' : '❌';
    text.textContent     = accepted ? 'ACCEPTED' : 'REJECTED';
    text.className       = 'res-text ' + (accepted ? 'accepted' : 'rejected');
    sub.textContent      = 'Final tape: ' + (tape||'(blank)') + '  ·  ' + steps + ' steps';
  }

  // ── Builder ──────────────────────────────────────────────────────────────────
  function builderAddRow() {
    var tbody = document.getElementById('builder-tbody');
    if (!tbody) return;
    var tr = document.createElement('tr');
    tr.innerHTML = 
      '<td><input type="text" class="b-cur-state" placeholder="e.g. q0" value="q0"></td>'+
      '<td><input type="text" class="b-read" placeholder="0, 1, or B" value="0"></td>'+
      '<td><input type="text" class="b-next-state" placeholder="e.g. q0" value="q0"></td>'+
      '<td><input type="text" class="b-write" placeholder="0, 1, or B" value="0"></td>'+
      '<td><select class="b-dir"><option value="R">Right</option><option value="L">Left</option></select></td>'+
      '<td><button class="btn-remove" onclick="this.closest(\'tr\').remove()">X</button></td>';
    tbody.appendChild(tr);
  }

  function builderSaveAndSimulate() {
    var errEl = document.getElementById('build-error');
    if (errEl) errEl.textContent = '';

    var tbody = document.getElementById('builder-tbody');
    var rows = tbody ? tbody.querySelectorAll('tr') : [];
    if (rows.length === 0) {
      if (errEl) errEl.textContent = 'Please add at least one transition.';
      return;
    }

    var customDef = {
      startState: 'q0',
      BLANK: 'B',
      transitions: {}
    };

    var statesSet = new Set(['q0', 'q_accept', 'q_reject']);
    var transList = [];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var curState = row.querySelector('.b-cur-state').value.trim();
      var readSym = row.querySelector('.b-read').value.trim();
      var nextState = row.querySelector('.b-next-state').value.trim();
      var writeSym = row.querySelector('.b-write').value.trim();
      var dir = row.querySelector('.b-dir').value;

      if (!curState || !readSym || !nextState || !writeSym) {
        if (errEl) errEl.textContent = 'All fields in the transition table must be filled.';
        return;
      }

      statesSet.add(curState);
      statesSet.add(nextState);

      if (!customDef.transitions[curState]) customDef.transitions[curState] = {};
      customDef.transitions[curState][readSym] = {
        nextState: nextState,
        write: writeSym,
        direction: dir
      };

      transList.push({
        from: curState,
        to: nextState,
        label: readSym + '/' + writeSym + ',' + dir
      });
    }

    // Build graph definition
    var states = Array.from(statesSet).map(function(s) {
      var type = 'normal';
      if (s === 'q0') type = 'start';
      else if (s === 'q_accept') type = 'accept';
      else if (s === 'q_reject') type = 'reject';
      return { id: s, label: s, type: type };
    });

    var graphDef = {
      states: states,
      transitions: transList,
      startState: 'q0',
      acceptState: 'q_accept',
      rejectState: 'q_reject'
    };

    var nameInput = document.getElementById('custom-machine-name');
    var customName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : 'Custom Machine';

    var customMachine = {
      id: 'custom',
      name: customName,
      description: 'Your custom built Turing Machine',
      inputHint: 'Binary string',
      examples: ['0', '1', '101', '0000', '1111'],
      customDef: customDef,
      graphDef: graphDef
    };

    selectMachine(customMachine, '');
  }

  // ── Refresh buttons ──────────────────────────────────────────────────────────
  function refreshButtons() {
    var prev = document.getElementById('btn-prev');
    var fwd  = document.getElementById('btn-fwd');
    var play = document.getElementById('btn-play');
    if (prev) prev.disabled = TM.atStart();
    if (fwd)  fwd.disabled  = TM.atEnd();
    if (play) {
      play.textContent = TM.isPlaying ? '⏸' : '▶';
      play.classList.toggle('playing', TM.isPlaying);
      play.disabled = TM.atEnd() && !TM.isPlaying;
    }
  }

  // ── Utility ──────────────────────────────────────────────────────────────────
  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Speed slider ──────────────────────────────────────────────────────────────
  function initSpeedSlider() {
    var slider = document.getElementById('speed-slider');
    if (!slider) return;
    slider.addEventListener('input', function() {
      var lbl = document.getElementById('speed-lbl');
      if (lbl) lbl.textContent = slider.value + 'x';
      if (TM.isPlaying) {
        engineStopPlay();
        engineStartPlay(function(){renderStep(true);}, function(){refreshButtons();}, parseInt(slider.value));
      }
    });
  }

  // ── Input live validation ─────────────────────────────────────────────────────
  function initInput() {
    var inp = document.getElementById('input-string');
    var err = document.getElementById('input-error');
    if (!inp) return;
    inp.addEventListener('input', function() {
      var v = validateBinaryInput(inp.value.trim());
      if (err) err.textContent = v.err || '';
      inp.style.borderColor = v.err ? '#ff4466' : '';
    });
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleCheck();
    });
  }

  // ── Expose all functions to window ────────────────────────────────────────────
  window.navigate       = navigate;
  window.handleCheck    = handleCheck;
  window.tmReset        = tmReset;
  window.tmStepForward  = tmStepForward;
  window.tmStepBack     = tmStepBack;
  window.tmTogglePlay   = tmTogglePlay;
  window.tmToggleLog    = tmToggleLog;
  window.tmUseExample   = tmUseExample;
  window.builderAddRow  = builderAddRow;
  window.builderSaveAndSimulate = builderSaveAndSimulate;

  // ── Boot ──────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    initParticles();
    initSpeedSlider();
    initInput();
    navigate('page-landing');
    console.log('tm-app.js ready');
  });

})();
