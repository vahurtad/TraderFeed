import chalk from 'chalk';
var inquirer = require('inquirer');

var feedQ= [{
    type:'rawlist',
    name:'choice',
    message:'Which?',
    choices:[
        'Limit Buy- User',
        'Double Sided Order',
        'Limit Buy - Best Bid',
        'Limit Sell - Best Ask',
        'exit'
    ]
}];

var more = [
        {
            type: 'input',
            name: 'price',
            message:'Price to buy'
        },
        {
            type: 'input',
            name: 'size',
            message:'Size',
            default: 'all'  
        },
        {
            type: 'input',
            name: 'target',
            message:'Target to Sell'  
        },
        {
            type: 'input',
            name: 'stop',
            message:'Stop Loss'  
        }
    ];

function one(){
    inquirer.prompt(more)
        .then(
            params =>{
                console.log(chalk.green(params.price))
            }
        )
}

inquirer.prompt(feedQ).then(ans =>{
    if(ans.choice ==='Limit Buy- User') {
        one();
    }
    else if(ans.choice ==='Double Sided Order') one()
    else if(ans.choice ==='Limit Buy - Best Bid') one()
    else if(ans.choice ==='Limit Sell - Best Ask') one()
    else if(ans.choice==='exit'){
        console.log(chalk.cyan('Good Bye 👋\n')); process.exit();
    }
    else console.log('Sorry, wrong answer')
})    