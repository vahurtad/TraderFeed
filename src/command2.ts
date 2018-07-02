var inquirer = require('inquirer');
import chalk from 'chalk';

const Rx = require('rx');
const prompts = new Rx.Subject();

function processQ(answers){
  console.log("And your answers are:", answers);
}

var feedQ= {
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
};

var treat ={
  when : function( answers ) {
    return answers.feedback === "Limit Buy- User";
  },
  message: "Start",
  type: "input",
  name: "start",
};  

function setLimitBuy(price, size, target, stop){
    //buy then 
    //execute double sided order
    console.log('the price:', price)
}

function getLimitBuy1(){
    //not holding
    inquirer.prompt([
        {
            type: 'input',
            name: 'price',
            message:'Price'
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
            message:'Target'  
        },
        {
            type: 'input',
            name: 'stop',
            message:'Stop'  
        }
    ]).then(params =>{
        setLimitBuy(params.price,params.size,params.target,params.stop);
    })
}

function getDoubleSided(){
    //executes when holding
    inquirer.prompt([
       {
            type: 'input',
            name: 'size',
            message:'Size',
            default: 'all'  
        },
        {
            type: 'input',
            name: 'stop',
            message:'Stop'  
        }
    ]).then(params =>{
        console.log(params.target,params.stop);
    })
}

function getLimitBuyBid(){
    //buy at best bid as it changes
    inquirer.prompt([
        {
            type: 'input',
            name: 'size',
            message:'Size',
            default: 'all'  
        }
    ]).then(params =>{
        console.log(params.size);
    })
}

function getLimitBuyAsk(){
    //sell at best ask as it changes
    inquirer.prompt([
        {
            type: 'input',
            name: 'size',
            message:'Size',
            default: 'all'  
        }
    ]).then(params =>{
        console.log(params.size);
    })
}

//main
inquirer.prompt(feedQ).then(ans =>{
    if(ans.choice ==='Limit Buy- User'){
        //execute double sided order
        //if price > target then set @ new best ask
        //stop @ market?
        getLimitBuy1()
    }
    else if(ans.choice ==='Double Sided Order'){
        getDoubleSided()
    }
    else if(ans.choice ==='Limit Buy - Best Bid'){
        getLimitBuyBid()
    }
    else if(ans.choice ==='Limit Sell - Best Ask'){
        getLimitBuyAsk()
    }
    else if(ans.choice==='exit'){
        console.log(chalk.cyan('Good Bye 👋\n'));
    }
    else console.log('Sorry, wrong answer')
})