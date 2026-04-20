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

module.exports = MACHINES;
