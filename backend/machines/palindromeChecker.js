const BLANK = 'B';

// Mark-and-compare palindrome checker
// Repeatedly marks leftmost unread symbol, finds rightmost, compares
const transitions = {
  // q0: read leftmost unread symbol (skip already-marked X)
  q0: {
    'B': { nextState: 'q_accept', write: 'B', direction: 'R' }, // empty/all-X => accept
    'X': { nextState: 'q0',       write: 'X', direction: 'R' }, // skip X going right
    '0': { nextState: 'q1',       write: 'X', direction: 'R' }, // mark left '0', go find right '0'
    '1': { nextState: 'q2',       write: 'X', direction: 'R' }, // mark left '1', go find right '1'
  },

  // q1: saw '0' on left — scan all the way right past everything
  q1: {
    '0': { nextState: 'q1', write: '0', direction: 'R' },
    '1': { nextState: 'q1', write: '1', direction: 'R' },
    'X': { nextState: 'q1', write: 'X', direction: 'R' },
    'B': { nextState: 'q3', write: 'B', direction: 'L' }, // hit right end, now scan left for match
  },

  // q2: saw '1' on left — scan all the way right past everything
  q2: {
    '0': { nextState: 'q2', write: '0', direction: 'R' },
    '1': { nextState: 'q2', write: '1', direction: 'R' },
    'X': { nextState: 'q2', write: 'X', direction: 'R' },
    'B': { nextState: 'q5', write: 'B', direction: 'L' }, // hit right end, now scan left for match
  },

  // q3: at right end, was looking for '0' — find rightmost unread symbol
  q3: {
    'X': { nextState: 'q3',       write: 'X', direction: 'L' }, // skip X
    'B': { nextState: 'q_accept', write: 'B', direction: 'R' }, // all X => accept
    '0': { nextState: 'q4',       write: 'X', direction: 'L' }, // matched!
    '1': { nextState: 'q_reject', write: '1', direction: 'L' }, // mismatch!
  },

  // q5: at right end, was looking for '1' — find rightmost unread symbol
  q5: {
    'X': { nextState: 'q5',       write: 'X', direction: 'L' }, // skip X
    'B': { nextState: 'q_accept', write: 'B', direction: 'R' }, // all X => accept
    '1': { nextState: 'q4',       write: 'X', direction: 'L' }, // matched!
    '0': { nextState: 'q_reject', write: '0', direction: 'L' }, // mismatch!
  },

  // q4: go back left to find new leftmost unread symbol
  q4: {
    '0': { nextState: 'q4', write: '0', direction: 'L' },
    '1': { nextState: 'q4', write: '1', direction: 'L' },
    'X': { nextState: 'q4', write: 'X', direction: 'L' },
    'B': { nextState: 'q0', write: 'B', direction: 'R' }, // reached left end, restart
  },
};

function getGraphDefinition() {
  return {
    states: [
      { id: 'q0',       label: 'q0',   type: 'start'  },
      { id: 'q1',       label: 'q1',   type: 'normal' },
      { id: 'q2',       label: 'q2',   type: 'normal' },
      { id: 'q3',       label: 'q3',   type: 'normal' },
      { id: 'q4',       label: 'q4',   type: 'normal' },
      { id: 'q5',       label: 'q5',   type: 'normal' },
      { id: 'q_accept', label: 'qACC', type: 'accept' },
      { id: 'q_reject', label: 'qREJ', type: 'reject' },
    ],
    transitions: [
      { from: 'q0', to: 'q1',       label: '0/X,R' },
      { from: 'q0', to: 'q2',       label: '1/X,R' },
      { from: 'q0', to: 'q0',       label: 'X/X,R' },
      { from: 'q0', to: 'q_accept', label: 'B/B,R' },
      { from: 'q1', to: 'q1',       label: '0,1,X stay' },
      { from: 'q1', to: 'q3',       label: 'B/B,L' },
      { from: 'q2', to: 'q2',       label: '0,1,X stay' },
      { from: 'q2', to: 'q5',       label: 'B/B,L' },
      { from: 'q3', to: 'q4',       label: '0/X,L' },
      { from: 'q3', to: 'q_reject', label: '1 mismatch' },
      { from: 'q3', to: 'q_accept', label: 'B/B,R' },
      { from: 'q3', to: 'q3',       label: 'X/X,L' },
      { from: 'q5', to: 'q4',       label: '1/X,L' },
      { from: 'q5', to: 'q_reject', label: '0 mismatch' },
      { from: 'q5', to: 'q_accept', label: 'B/B,R' },
      { from: 'q5', to: 'q5',       label: 'X/X,L' },
      { from: 'q4', to: 'q4',       label: '0,1,X stay' },
      { from: 'q4', to: 'q0',       label: 'B/B,R' },
    ],
    startState:  'q0',
    acceptState: 'q_accept',
    rejectState: 'q_reject',
  };
}

module.exports = { transitions, getGraphDefinition, BLANK, startState: 'q0' };
