const BLANK = 'B';

const transitions = {
  q0: {
    '0': { nextState: 'q1',       write: '0', direction: 'R' },
    '1': { nextState: 'q0',       write: '1', direction: 'R' },
    'B': { nextState: 'q_accept', write: 'B', direction: 'R' },
  },
  q1: {
    '0': { nextState: 'q0',       write: '0', direction: 'R' },
    '1': { nextState: 'q1',       write: '1', direction: 'R' },
    'B': { nextState: 'q_reject', write: 'B', direction: 'R' },
  },
};

function getGraphDefinition() {
  return {
    states: [
      { id: 'q0',       label: 'q0 even', type: 'start'  },
      { id: 'q1',       label: 'q1 odd',  type: 'normal' },
      { id: 'q_accept', label: 'qACC',    type: 'accept' },
      { id: 'q_reject', label: 'qREJ',    type: 'reject' },
    ],
    transitions: [
      { from: 'q0', to: 'q1',       label: '0/0,R' },
      { from: 'q0', to: 'q0',       label: '1/1,R' },
      { from: 'q0', to: 'q_accept', label: 'B/B,R' },
      { from: 'q1', to: 'q0',       label: '0/0,R' },
      { from: 'q1', to: 'q1',       label: '1/1,R' },
      { from: 'q1', to: 'q_reject', label: 'B/B,R' },
    ],
    startState:  'q0',
    acceptState: 'q_accept',
    rejectState: 'q_reject',
  };
}

module.exports = { transitions, getGraphDefinition, BLANK, startState: 'q0' };
