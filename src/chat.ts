// run with `node infinite.js` in node v4.x+
// must have Inquirer installed (`npm install inquirer`)

import * as inquirer from 'inquirer';
const Rx = require('rx');
var output=[];

const prompts = new Rx.Subject();

var asking = ['price','size','target','stop'];

function makePrompt(msg) {
  return {
    type: 'input',
    name: `${msg}`,
    message: `${msg}`,
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

while(i<asking.length){
    prompts.onNext(makePrompt(asking[i]));
    i+=1;   
}
prompts.onCompleted();  