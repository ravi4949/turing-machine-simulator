// tm-engine.js — Turing Machine client-side engine
// All functions are global (no modules) so HTML onclick attributes work.

var TM = {
  history:     [],
  currentStep: 0,
  isPlaying:   false,
  playTimer:   null,
  result:      null,

  reset: function() {
    clearInterval(this.playTimer);
    this.history     = [];
    this.currentStep = 0;
    this.isPlaying   = false;
    this.playTimer   = null;
    this.result      = null;
  },
  atEnd:   function() { return this.currentStep >= this.history.length - 1; },
  atStart: function() { return this.currentStep <= 0; },
  current: function() { return this.history[this.currentStep] || null; },
};

// ── API calls ─────────────────────────────────────────────────────────────────

var API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';

function apiFetchMachines() {
  return fetch(API_BASE + '/api/machines')
    .then(function(r) {
      if (!r.ok) throw new Error('Failed to load machines');
      return r.json();
    })
    .then(function(d) { return d.machines; });
}

function apiFetchGraph(machineId) {
  return fetch(API_BASE + '/api/machines/' + machineId + '/graph')
    .then(function(r) {
      if (!r.ok) throw new Error('Failed to load graph');
      return r.json();
    });
}

function apiSimulate(machineId, input, customDef) {
  return fetch(API_BASE + '/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ machineId: machineId, input: input, customDef: customDef }),
  }).then(function(r) {
    return r.json().then(function(data) {
      if (!r.ok) throw new Error(data.error || 'Simulation failed');
      return data;
    });
  });
}

// ── Run simulation ────────────────────────────────────────────────────────────

function runSimulation(machineId, input, customDef) {
  TM.reset();
  return apiSimulate(machineId, input, customDef).then(function(data) {
    TM.history = data.history;
    TM.result  = {
      accepted:  data.accepted,
      finalTape: data.finalTape,
      steps:     data.steps,
    };
    TM.currentStep = 0;
    return data;
  });
}

// ── Step controls (raw — used by engine internally) ───────────────────────────

function engineStepForward() {
  if (TM.atEnd()) return null;
  TM.currentStep++;
  return TM.current();
}

function engineStepBack() {
  if (TM.atStart()) return null;
  TM.currentStep--;
  return TM.current();
}

function engineGoToStep(i) {
  TM.currentStep = Math.max(0, Math.min(i, TM.history.length - 1));
  return TM.current();
}

// ── Auto-play ─────────────────────────────────────────────────────────────────

function engineStartPlay(onStep, onEnd, speed) {
  if (TM.isPlaying) return;
  TM.isPlaying = true;
  var delay = Math.max(50, 1050 - (speed || 5) * 100);
  TM.playTimer = setInterval(function() {
    if (TM.atEnd()) {
      engineStopPlay();
      if (onEnd) onEnd();
      return;
    }
    var cfg = engineStepForward();
    if (onStep) onStep(cfg);
  }, delay);
}

function engineStopPlay() {
  clearInterval(TM.playTimer);
  TM.playTimer = null;
  TM.isPlaying = false;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateBinaryInput(s) {
  if (typeof s !== 'string')   return { ok: false, err: 'Input must be a string' };
  if (s.length === 0)          return { ok: true,  err: null };
  if (s.length > 64)           return { ok: false, err: 'Too long (max 64 characters)' };
  if (!/^[01]+$/.test(s))      return { ok: false, err: 'Only 0 and 1 are allowed' };
  return { ok: true, err: null };
}
