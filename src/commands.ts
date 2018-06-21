import * as inquirer from 'inquirer'
import chalk from 'chalk';
import * as GTT from 'gdaxtt2';
import { LiveBookConfig, LiveOrderbook, PlaceOrderMessage, TradeExecutedMessage, TradeFinalizedMessage, MyOrderPlacedMessage, Trigger, TickerMessage, StreamMessage, SnapshotMessage } from 'gdaxtt2/build/src/core';
import { GDAXConfig } from 'gdaxtt2/build/src/exchanges/gdax/GDAXInterfaces';
import { GDAXFeedConfig, GDAXExchangeAPI, GDAX_WS_FEED, GDAX_API_URL, GDAXFeed, ExchangeFeed } from 'gdaxtt2/build/src/exchanges';
import { LiveOrder, BookBuilder } from 'gdaxtt2/build/src/lib';

const Rx = require('rx');
const prompts = new Rx.Subject();
var input = process.stdin;
input.setEncoding('utf-8'); 


var q1=[
    {
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
    },{when: function(response){
        ask:['price','size','target','stop']
        if(response.choice==='Limit Buy- User'){
            var output=[];
            var asking = [{
                    type: 'input',
                    name: 'price',
                    message: 'price', 
                },
                {
                    type: 'input',
                    name: 'size',
                    message: 'size', 
                },
                {
                    type: 'input',
                    name: 'target',
                    message: 'target', 
                },
                {
                    type: 'input',
                    name: 'stop',
                    message: 'stop', 
                }
            
            ];
        
        }
        else if(response.choice==='Double Sided Order'){console.log('Double Sided Order')}
        else if(response.choice==='Limit Buy - Best Bid'){console.log('Limit Buy - Best Bid')}
        else if(response.choice==='Limit Sell - Best Ask'){console.log('Limit Sell - Best Ask')}
        else{console.log(response.choice)}
        }
    },
    {
        type: 'input',
        name: 'loop',
        message: 'y to back, Enter to exit'
    },
    {when: function(response){
        if(response.loop==='y'){console.log(chalk.red('going back 👈\n'))}
        else if(response.loop==='n'){
            console.log(chalk.cyan('Good Bye 👋\n'));
            process.exit();
            }
        },
    }
]

var questions =[
    {
        type: 'input',
        name: 'buy_price',
        message:'Price'
      },
      {
        type: 'input',
        name: 'buy_size',
        message:'Size'  
      }
];

const logger = GTT.utils.ConsoleLoggerFactory({level: 'error'});
const gdaxConfig:GDAXConfig ={
    logger:logger,
    apiUrl: process.env.GDAX_API_URL || 'https://api.gdax.com',
    auth: {
        key: process.env.GDAX_KEY,
        secret: process.env.GDAX_SECRET,
        passphrase: process.env.GDAX_PASSPHRASE
    }
};
const gdax = new GDAXExchangeAPI(gdaxConfig);

/*
 set pice and size
 call double-sided order with target and stop
 */
function getLimitBuy()
{
    var output=[];
    var asking = ['price','size','target','stop'];

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
}

function makePrompt(msg) {
    return {
      type: 'input',
      name: `lb${msg}`,
      message: `${msg}\n\n`,
    };
}

//recursive function
function ask() {
    inquirer.prompt(q1).then(answers =>{
        // if(answers.choice ==='exit') {
        //     console.log(chalk.cyan('Good Bye 👋\n'))
        //     process.exit();
        // }
        if(answers.loop==='y'){
            ask();
        }
        else{
            console.log(chalk.cyan('Good Bye 👋\n'));
        }
    })
  }
  ask();