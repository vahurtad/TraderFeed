/**
 * Recursive prompt example
 * Allows user to choose when to exit prompt
 */

'use strict';
import * as inquirer from 'inquirer';
const output = [];

const questions = [
  {
    type: 'rawlist',
    name: 'choice',
    message: 'Which?',
    choices: [
        'Limit Buy- User',
        'Double Sided Order',
        'Limit Buy - Best Bid',
        'Limit Sell - Best Ask',
        'exit'
    ]
  },
  {
    type: 'confirm',
    name: 'loop',
    message: 'Enter to go back',
    default: true
  }
];

// recursive function
function ask() {
  inquirer.prompt(questions).then( (answers) => {
    if (answers.choice === 'exit') {
      console.log('Good Bye 👋\n'); process.exit();
    } else {
      output.push(answers.choice);
      if (answers.loop) {
        ask();
      }
    }
  });
}

ask();
