import * as inquirer from 'inquirer'
import chalk from 'chalk';

const Rx = require('rx');
const prompts = new Rx.Subject();
const input = process.stdin;
input.setEncoding('utf-8');

const questions = [
    {
        type: 'input',
        name: 'buy_price',
        message: 'Price'
      },
      {
        type: 'input',
        name: 'buy_size',
        message: 'Size'
      }
];

const q1 = [
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
        ],
        when: (ans) => {
            return dummy(ans);
        }
    },
    {
        type: 'input',
        name: 'loop',
        message: 'y to back, Enter to exit'
    },
    {when: (response) => {
        if (response.loop === 'y') {
            console.log(chalk.red('going back 👈\n'));
        } else
        if (response.loop === 'n') {
            console.log(chalk.cyan('Good Bye 👋\n'));
            process.exit();
        }
    },
}];

function dummy(t) {
    console.log('dummy', t);
}

function more() {
    inquirer.prompt([{
        type: 'rawlist',
        name: 'more',
        message: 'Account',
        choices: [
            'Balances',
            'Orders',
            'Auth',
            'exit'
        ]
    }]).then((ans) => {
        console.log(ans);
    });
}

function getLimitBuy() {
    const output = [];
    const asking = ['price','size','target','stop'];

    let i = 0;
    inquirer.prompt(prompts).ui.process.subscribe(({ answer }) => {
        output.push(answer);
    }, (err) => {
    console.warn(err);
    }, () => {
    console.log('Answer:', output);
    }).then((a) => {
        console.log(a);
    });

    while (i < asking.length) {
        prompts.onNext(makePrompt(asking[i]));
        i += 1;
    }
    prompts.onCompleted();
}

function makePrompt(msg) {
    return {
      type: 'input',
      name: `lb${msg}`,
      message: `${msg}\n\n`,
    };
}

// recursive function
function ask() {
    inquirer.prompt(q1).then((answers) => {
        if (answers.loop === 'y') {
            ask();
        } else
        if (answers.loop === 'n') {
            console.log(chalk.cyan('Good Bye 👋\n'));
            process.exit();
        }
    });
  }
ask();
