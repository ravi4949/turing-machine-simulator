const express = require('express');
const cors    = require('cors');
const path    = require('path');

const binaryIncrementer = require('./machines/binaryIncrementer');
const palindromeChecker = require('./machines/palindromeChecker');
const evenZeroChecker   = require('./machines/evenZeroChecker');

const MACHINES = {
  binary_incrementer: {
    id: 'binary_incrementer', name: 'Binary Incrementer',
    description: 'Adds 1 to a binary number. Example: 1011 becomes 1100',
    inputHint: 'Binary digits only (0 and 1)',
    examples: ['1011', '1111', '0', '101'],
    machine: binaryIncrementer,
  },
  palindrome_checker: {
    id: 'palindrome_checker', name: 'Palindrome Checker',
    description: 'Accepts binary strings that read the same forwards and backwards.',
    inputHint: 'Binary digits only (0 and 1)',
    examples: ['10101', '1001', '11', '0', '10001'],
    machine: palindromeChecker,
  },
  even_zero_checker: {
    id: 'even_zero_checker', name: 'Even Zeros Checker',
    description: 'Accepts strings with an even number of zeros (zero zeros is even).',
    inputHint: 'Binary digits only (0 and 1)',
    examples: ['1111', '00', '0110', '1001', '0'],
    machine: evenZeroChecker,
  },
};

// ── Core TM simulator ─────────────────────────────────────────────────────────

function runMachine(inputString, machineId, customDef) {
  let def;
  if (machineId === 'custom') {
    if (!customDef) throw new Error('Custom machine definition required');
    def = { machine: customDef };
  } else {
    def = MACHINES[machineId];
    if (!def) throw new Error('Unknown machine: ' + machineId);
  }

  const { transitions, BLANK, startState } = def.machine;
  const ACCEPT = 'q_accept';
  const REJECT = 'q_reject';
  const MAX    = 10000;

  let tape  = inputString.length > 0 ? inputString.split('') : [BLANK];
  let head  = 0;
  let state = startState;
  const history = [];

  // Step 0 — initial config
  history.push({
    step: 0, tape: tape.slice(), headPos: head, state: state,
    transitionStr: 'Initial configuration',
    readSymbol: tape[head] || BLANK, writtenSymbol: null, direction: null,
  });

  let steps = 0;

  while (state !== ACCEPT && state !== REJECT && steps < MAX) {
    // Extend tape if needed
    while (head >= tape.length) tape.push(BLANK);
    if (head < 0) {
      tape.unshift(BLANK);
      head = 0;
      for (let i = 0; i < history.length; i++) {
        history[i].tape.unshift(BLANK);
        history[i].headPos += 1;
      }
    }

    const sym = tape[head] || BLANK;
    const row = transitions[state];

    if (!row) {
      state = REJECT;
      history.push({
        step: ++steps, tape: tape.slice(), headPos: head, state,
        transitionStr: 'No transitions from state ' + state + ' — REJECT',
        readSymbol: sym, writtenSymbol: null, direction: null,
      });
      break;
    }

    const t = row[sym] || row[BLANK];
    if (!t) {
      state = REJECT;
      history.push({
        step: ++steps, tape: tape.slice(), headPos: head, state,
        transitionStr: 'No transition for (' + state + ', ' + sym + ') — REJECT',
        readSymbol: sym, writtenSymbol: null, direction: null,
      });
      break;
    }

    tape[head] = t.write;
    const prevState = state;
    state = t.nextState;
    const prevHead = head;
    head = t.direction === 'R' ? head + 1 : head - 1;
    steps++;

    history.push({
      step: steps, tape: tape.slice(), headPos: head, state,
      transitionStr: 'δ(' + prevState + ', ' + sym + ') → (' + state + ', ' + t.write + ', ' + t.direction + ')',
      readSymbol: sym, writtenSymbol: t.write, direction: t.direction,
    });
  }

  if (steps >= MAX && state !== ACCEPT && state !== REJECT) {
    state = REJECT;
    history.push({
      step: steps + 1, tape: tape.slice(), headPos: head, state,
      transitionStr: 'Max steps exceeded — possible infinite loop',
      readSymbol: null, writtenSymbol: null, direction: null,
    });
  }

  // Strip trailing blanks from final tape
  const finalTape = tape.slice();
  while (finalTape.length > 1 && finalTape[finalTape.length - 1] === BLANK) finalTape.pop();

  return { accepted: state === ACCEPT, finalState: state, finalTape, steps, history };
}

// ── Express app ───────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// GET /api/machines
app.get('/api/machines', (req, res) => {
  const list = Object.values(MACHINES).map(m => ({
    id: m.id, name: m.name, description: m.description,
    inputHint: m.inputHint, examples: m.examples,
  }));
  res.json({ machines: list });
});

// GET /api/machines/:id/graph
app.get('/api/machines/:id/graph', (req, res) => {
  const m = MACHINES[req.params.id];
  if (!m) return res.status(404).json({ error: 'Machine not found' });
  res.json(m.machine.getGraphDefinition());
});

// POST /api/simulate
app.post('/api/simulate', (req, res) => {
  const { machineId, input, customDef } = req.body;
  if (!machineId) return res.status(400).json({ error: 'machineId required' });
  if (machineId !== 'custom' && !MACHINES[machineId]) return res.status(400).json({ error: 'Unknown machine: ' + machineId });
  if (input === undefined || input === null) return res.status(400).json({ error: 'input required' });
  if (input.length > 0 && !/^[01]+$/.test(input)) return res.status(400).json({ error: 'Input must contain only 0 and 1' });
  if (input.length > 200) return res.status(400).json({ error: 'Input too long (max 200)' });

  try {
    res.json(runMachine(input, machineId, customDef));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve frontend for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log('\n✅ Turing Machine Simulator running at http://localhost:' + PORT + '\n');
});
