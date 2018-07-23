var inquirer = require('inquirer');
import chalk from 'chalk';
import * as dotenv from 'dotenv';

import * as GTT from 'gdaxtt2'
import { padfloat, printOrderbook } from 'gdaxtt2/build/src/utils';
import { LiveBookConfig, LiveOrderbook, PlaceOrderMessage, TradeExecutedMessage, TradeFinalizedMessage, MyOrderPlacedMessage, Trigger, TickerMessage, StreamMessage, SnapshotMessage, LevelMessage } from 'gdaxtt2/build/src/core';
import { GDAXConfig } from 'gdaxtt2/build/src/exchanges/gdax/GDAXInterfaces';
import { GDAXFeedConfig, GDAXExchangeAPI, GDAX_WS_FEED, GDAX_API_URL, GDAXFeed, ExchangeFeed } from 'gdaxtt2/build/src/exchanges';
// import { LiveOrder, BookBuilder } from 'gdaxtt2/build/src/core';
import { Ticker } from 'gdaxtt2/build/src/exchanges/PublicExchangeAPI';
import { DefaultAPI, getSubscribedFeeds,FeedFactory } from 'gdaxtt2/build/src/factories/gdaxFactories';

var bid;
var ask;
var temp;

/*
 * MENU  
 */
const before = {
    ask: '',
    bid:'',
    target:''
};

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

function setLimitBuy(current_price,best_ask, price, size, target, stop){
    //buy at target as maker 
    //console.log(Number(current_price) == price)
    //execute double sided order
    if(Number(current_price) == parseFloat(price)){
         // if order executed, then trigger doublesided order
        console.log('trigger double sided order')
        setDoubleSidedOrder(current_price,best_ask, stop, target, size)
    }
    else if(Number(current_price) == stop){
        //cancel order
        //exit
        process.exit()
    }
   
}

//when not holding, buy and execute double sided order
//if price > target then set @ new best ask price
//if stop @ post did not execute stop @ market?
function getLimitBuy1(){
    inquirer.prompt([
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
    ]).then(params =>{
        console.log('Price to Buy:', chalk.green(params.price))
        loadTick('1',params)
    })
}

//while holding, sell range [target or stop]
//if current price > target then set at best ask
//if price <= stop, sell @ market(taker)
function setDoubleSidedOrder(current_price,best_ask, stop, target, size){
    var mytarget = target;
    //only change order when current target has changed
    //console.log(best_ask,target,mytarget)
    target = Math.max(best_ask,target,mytarget);
    //check if target has changed
    if(target.valueOf() !== before.target.valueOf()) {
        console.log('target changed', chalk.cyan(target))
        before.target=target
        if(Number(current_price) == target){
            console.log('target reached')
            //exit if order is done
        }
        else if(Number(current_price)<= parseFloat(stop)){
            //cancel order    
            //sell as taker
            console.log('sell as taker', stop)
            //complete sell
            process.exit();           
            //set order  
        }
    }
    //not necessary
    else if(target.valueOf() == before.target.valueOf()){
        //do nothing
        //console.log('same', target)
    }
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
            name: 'target',
            message:'Target to Sell'
        },
        {
            type: 'input',
            name: 'stop',
            message:'Stop Loss'  
        }
    ]).then(params =>{
        loadTick('2',params)
    })
}
function setLimitBuyBid(current_price,best_bid, size, target, stop){
    //buy at best bid

}

function getLimitBuyBid(){
        //buy at best bid as it changes
        inquirer.prompt([
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
        ]).then(params =>{
            loadTick('3',params)
        })
}
function setLimitSellAsk(current_price,best_ask, size, target, stop){
    //sell at best ask

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
        loadTick('4',params)
    })
}

/*
 * GDAX  
 */
const result = dotenv.config();

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

function loadTick(isMenu, params){
    var currentTicker;
    var currentAsk;
    var currentBid;
    var product= 'BCH-USD';
   
    getSubscribedFeeds(gdaxConfig, [product]).then((feed: GDAXFeed) => {
        const config: LiveBookConfig = {
        product: product,
        logger: logger
        };
        const book = new LiveOrderbook(config);
       
        book.on('data',()=>{});
        book.on('LiveOrderbook.ticker', (ticker: Ticker) => {
            currentTicker = ticker.price;
            console.log(`${chalk.green('💰 ')} ${ticker.price.toFixed(2)} ${chalk.green(' 💰')} `)        
        });
        book.on('LiveOrderbook.update', (msg: LevelMessage)=>{
            const highestBid = book.book.highestBid.price.toFixed(2);
            const lowestAsk = book.book.lowestAsk.price.toFixed(2);
                
            if (highestBid.valueOf() !== spread.bestBid.valueOf() ||lowestAsk.valueOf() !== spread.bestAsk.valueOf()) {
                spread.bestBid = highestBid;
                spread.bestAsk = lowestAsk;
                currentAsk = parseFloat(spread.bestAsk);
                currentBid= parseFloat(spread.bestBid);

                bid = parseFloat(spread.bestBid)
                console.log(`${chalk.green('|')} ${spread.bestBid} ${chalk.red('|')} ${spread.bestAsk}`);   
                if(isMenu === '1'){
                    setLimitBuy(currentTicker,currentAsk,params.price,params.size,params.target,params.stop)
                } 
                else if(isMenu==='2'){
                    setDoubleSidedOrder(currentTicker,currentAsk,params.stop,params.target, params.size)
                }
                else if(isMenu==='3'){
                    setDoubleSidedOrder(currentTicker,currentAsk,params.stop,params.target, params.size)
                }       
                else if(isMenu==='4'){
                    setDoubleSidedOrder(currentTicker,currentAsk,params.stop,params.target, params.size)
                }  
            }
        });
        feed.pipe(book);
    }).catch(function(err){console.log('ERROR',err)})
}

function printTicker(product:string, ticker: Ticker, quotePrec: number = 2): string {
    return `${padfloat(ticker.price, 10, quotePrec)}`;  
  }
  
function printStats(book: LiveOrderbook) {
    `${chalk.red('|')}${padfloat(book.state().asks[0].totalSize,5,4)} ${book.state().asks[0].price}`
         +`\t${chalk.green('|')}${padfloat(book.state().bids[0].totalSize,5,4)} ${book.state().bids[0].price}` ;
    
        var best_bid=book.state().bids[0].price;
        var old_bid = best_bid;
        best_bid=book.state().bids[0].price;
        console.log(`${best_bid}  ${old_bid}`);    
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
    if(ans.choice ==='Limit Buy- User') getLimitBuy1();
    else if(ans.choice ==='Double Sided Order') getDoubleSided()
    else if(ans.choice ==='Limit Buy - Best Bid') getLimitBuyBid()
    else if(ans.choice ==='Limit Sell - Best Ask') getLimitBuyAsk()
    else if(ans.choice==='exit'){
        console.log(chalk.cyan('Good Bye 👋\n')); process.exit();
    }
    else console.log('Sorry, wrong answer')
})