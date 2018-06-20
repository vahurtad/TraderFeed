import * as inquirer from 'inquirer'
import chalk from 'chalk';
import * as GTT from 'gdaxtt2';
import { LiveBookConfig, LiveOrderbook, PlaceOrderMessage, TradeExecutedMessage, TradeFinalizedMessage, MyOrderPlacedMessage, Trigger, TickerMessage, StreamMessage, SnapshotMessage } from 'gdaxtt2/build/src/core';
import { GDAXConfig } from 'gdaxtt2/build/src/exchanges/gdax/GDAXInterfaces';
import { GDAXFeedConfig, GDAXExchangeAPI, GDAX_WS_FEED, GDAX_API_URL, GDAXFeed, ExchangeFeed } from 'gdaxtt2/build/src/exchanges';
import { LiveOrder, BookBuilder } from 'gdaxtt2/build/src/lib';


var input = process.stdin;
input.setEncoding('utf-8'); 
var output=[];

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
    },
    {
        type: 'confirm',
        name: 'loop',
        message: 'Enter to go back'
    },
    {when: function(response){
        if(response.loop){console.log('f')}
        else{
            console.log(chalk.cyan('Good Bye 👋\n'));
            process.exit();
            }
        },
    }
    //       type: 'input',
    //       name: 'back',
    //       message: 'go back?'
    //   }
    //   , {when: function(response){
    //         if(response.back==='y'){console.log('f')}
    //         else{
    //             console.log(chalk.cyan('Good Bye 👋\n'));
    //             process.exit();
    //             }
    //         }
    //     }
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
function setLimitBuy()
{
  inquirer.prompt([{
    type: 'input',
    name: 'limit_buy',
    message: 'price'
  },

])
}

//recursive function
function ask() {
    
    // inquirer.prompt(q1).then(answers => {
    //     //loop
    //     if(answers.choice ==='Limit Buy- User') {
    //         console.log('---');
    //     }
    //     if(answers.choice ==='exit') {
    //         console.log(chalk.cyan('Good Bye 👋\n'))
    //         process.exit();
    //     }
    //     if (answers.loop) {
    //         ask();
    //         if(answers.choice==='Limit Buy- User')
    //         {
    //             console.log(chalk.yellow('here'));
    //         }
    //     }
    //     else {
    //         console.log(chalk.cyan('Good Bye 👋\n'));
    //     }
    // });

    inquirer.prompt(q1).then(answers =>{
        console.log(answers);
        if(answers.loop){
            ask();
        }
        else{
            console.log(chalk.cyan('Good Bye 👋\n'));
        }
    })
  }
  
  ask();