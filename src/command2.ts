var inquirer = require('inquirer');
import chalk from 'chalk';
import * as dotenv from 'dotenv';

import * as GTT from 'gdaxtt2';
import { padfloat, printOrderbook } from 'gdaxtt2/build/src/utils';
import { LiveBookConfig, LiveOrderbook, PlaceOrderMessage, TradeExecutedMessage, TradeFinalizedMessage, MyOrderPlacedMessage, Trigger, TickerMessage, StreamMessage, SnapshotMessage, LevelMessage } from 'gdaxtt2/build/src/core';
import { GDAXConfig } from 'gdaxtt2/build/src/exchanges/gdax/GDAXInterfaces';
import { GDAXFeedConfig, GDAXExchangeAPI, GDAX_WS_FEED, GDAX_API_URL, GDAXFeed, ExchangeFeed } from 'gdaxtt2/build/src/exchanges';
import { LiveOrder, BookBuilder } from 'gdaxtt2/build/src/lib';
import { Ticker } from 'gdaxtt2/build/src/exchanges/PublicExchangeAPI';
import { DefaultAPI, getSubscribedFeeds,FeedFactory } from 'gdaxtt2/build/factories/gdaxFactories';



/*
 * MENU  
 */
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
    ]}];

function setLimitBuy(price, size, target, stop){
    //buy then 
    //execute double sided order
    console.log('the price:', price)
}

function getLimitBuy1(){
    //when not holding, buy and execute double sided order
    //if price > target then set @ new best ask price
    //if stop @ post did not execute stop @ market?
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

/*
 * GDAX  
 */
const result = dotenv.config();
var input = process.stdin;

// const readline = require('readline');
// readline.emitKeypressEvents(process.stdin);
// process.stdin.setRawMode(true);
// process.stdin.on('keypress', (str, key) => {
//   if (key.ctrl && key.name === 'c') {
//     process.exit();
//   } else if (key.ctrl && key.name === 't') {
//     console.log('here')
//   }else {
//     console.log(`You pressed the "${str}" key`);
//     console.log();
//     console.log(key);
//     console.log();
//   }
// });
// console.log('Press any key...');
const spread = {
    bestBid: '',
    bestAsk: ''
};



const logger = GTT.utils.ConsoleLoggerFactory({level: 'error'});
const gdaxConfig : GDAXConfig ={
    logger:logger,
    apiUrl: process.env.GDAX_API_URL || 'https://api.gdax.com',
    auth: {
        key: process.env.GDAX_KEY,
        secret: process.env.GDAX_SECRET,
        passphrase: process.env.GDAX_PASSPHRASE
    }
};
//const gdax = new GDAXExchangeAPI(gdaxConfig);

function loadTick(){
    var product= 'BCH-USD';
    getSubscribedFeeds(gdaxConfig, [product]).then((feed: GDAXFeed) => {
        const config: LiveBookConfig = {
        product: product,
        logger: logger
        };
        const book = new LiveOrderbook(config);

        book.on('data',()=>{});
        // book.on('LiveOrderbook.snapshot', () => {
        // // setInterval(()=>{
        // //  // console.log(DefaultAPI(logger));
        // //  console.log(printStats(book));
        // // },2000);
        // });
        book.on('LiveOrderbook.ticker', (ticker: Ticker) => {
           // console.log(book.ticker);
        // setInterval(()=>{
        //     console.log(printStats(book));
    
        // },2000)
        });

        book.on('LiveOrderbook.update', (msg: LevelMessage)=>{
            const highestBid = book.book.highestBid.price.toFixed(2);
            const lowestAsk = book.book.lowestAsk.price.toFixed(2);
    
            if (highestBid.valueOf() !== spread.bestBid.valueOf()) {
                spread.bestBid = highestBid;
                console.log(`New best bid: ${spread.bestBid}`);
            }
    
            // if (lowestAsk.valueOf() !== spread.bestAsk.valueOf()) {
            //     spread.bestAsk = lowestAsk;
            //     console.log(`New best ask: ${spread.bestAsk}`);
            // }
        })
        feed.pipe(book);
        
    }).catch(function(err){console.log('ERROR',err)})
}
function printStats(book: LiveOrderbook) {
    var o=`${chalk.red('|')}${padfloat(book.state().asks[0].totalSize,5,4)} ${book.state().asks[0].price}`
         +`\t${chalk.green('|')}${padfloat(book.state().bids[0].totalSize,5,4)} ${book.state().bids[0].price}` ;
    
         var best_bid=book.state().bids[0].price;
         var old_bid = best_bid;
         best_bid=book.state().bids[0].price;
         return `${best_bid}  ${old_bid}`;
        
       
  }

// function limitOrderBuy(product: string, price: string, size: string){
//     const order: PlaceOrderMessage ={
//         type: 'placeOrder',
//         time: new Date(),
//         productId: product,
//         side: 'buy',
//         orderType: 'limit',
//         price: price,
//         postOnly: true, //maker: true, maker||taker: false 
//         size: size,
//       };
  
//       gdax.placeOrder(order).then((liveOrder: LiveOrder)=>
//       {
//           console.log(liveOrder)
//       })
//   }

  // function limitOrderSell(product: string, price: string, size: string){
//   const order: PlaceOrderMessage ={
//     type: 'placeOrder',
//     time: new Date(),
//     productId: product,
//     side: 'sell',
//     orderType: 'limit',
//     price: price,
//     postOnly: true, //maker: true, maker|taker: false 
//     size: size,
//   }
// }

// function marketOrderBuy(product: string, price: string, size: string){
//   const order: PlaceOrderMessage ={
//     type: 'placeOrder',
//     time: new Date(),
//     productId: product,
//     side: 'buy',
//     orderType: 'market',
//     price: price,
//     size: size,
//   }
// }
// function marketOrderSell(product: string, price: string, size: string){
//   const order: PlaceOrderMessage ={
//     type: 'placeOrder',
//     time: new Date(),//null?
//     productId: product,
//     side: 'sell',
//     orderType: 'market',
//     price: price,
//     size: size,
//   }
// }



/*
 * MAIN  
 */

inquirer.prompt(feedQ).then(ans =>{
    if(ans.choice ==='Limit Buy- User'){
        getLimitBuy1()


        loadTick();
        

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
        console.log(chalk.cyan('Good Bye 👋\n')); process.exit();
    }
    else console.log('Sorry, wrong answer')
})