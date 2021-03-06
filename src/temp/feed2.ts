/**
 * List prompt example
 */

import inquirer = require('inquirer');

inquirer.prompt([
    {
      type: 'list',
      name: 'size',
      message: 'What size do you need?',
      choices: ['Jumbo', 'Large', 'Standard', 'Medium', 'Small', 'Micro'],
      filter: (val) => {
        return val.toLowerCase();
      }
    }
  ])
  .then((answers) => {
    console.log(JSON.stringify(answers, null, '  '));
  });
