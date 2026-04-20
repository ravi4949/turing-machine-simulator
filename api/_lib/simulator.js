const MACHINES = require('./machinesRegistry');

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

module.exports = runMachine;
