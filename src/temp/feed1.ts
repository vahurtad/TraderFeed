// run with `node infinite.js` in node v4.x+
// must have Inquirer installed (`npm install inquirer`)

import * as inquirer from 'inquirer';
const Rx = require('rx');
var output=[];

const prompts = new Rx.Subject();

var type = ['price','size','target','stop'];
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

function makePrompt(msg) {
  return {
    type: 'input',
    name: `lb${type[i]}`,
    message: `${msg}\n\n`,
  };
}

let i = 0;
inquirer.prompt(prompts).ui.process.subscribe(({ answer }) => {
    output.push(answer);        
}, (err) => {
  console.warn(err);
}, () => {
  console.log('Answer:', output);
});

while(i<type.length){
    prompts.onNext(makePrompt(type[i]));
    i+=1;
}
prompts.onCompleted();  