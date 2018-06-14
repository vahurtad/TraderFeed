/**
 * Recursive prompt example
 * Allows user to choose when to exit prompt
 */

'use strict';
import * as inquirer from 'inquirer'
var output = [];

var questions = [
  {
    type:'rawlist',
    name:'choice',
    message:'Which?',
    choices:[
        'Limit Buy- User',
        'Double Sided Order',
        'Limit Buy - Best Bid',
        'Limit Sell - Best Ask'
    ]
  },
  {
    type: 'confirm',
    name: 'loop',
    message: 'Enter to go back',
    default: true
  }
];

//recursive function
function ask() {
  inquirer.prompt(questions).then(answers => {
    output.push(answers.choice);
    if (answers.loop) {
      ask();
    } else {
      console.log('Your choice:', output.join(', '));
    }
  });
}

ask();
