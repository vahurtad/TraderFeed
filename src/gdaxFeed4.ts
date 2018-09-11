
import * as dotenv from 'dotenv';
import chalk from 'chalk';

import * as GTT from 'gdax-tt';
import { padfloat, printOrderbook } from 'gdax-tt/build/src/utils';
import { LiveOrder, BookBuilder } from 'gdax-tt/build/src/lib';
import { Ticker } from 'gdax-tt/build/src/exchanges/PublicExchangeAPI';
import { GDAXConfig } from 'gdax-tt/build/src/exchanges/gdax/GDAXInterfaces';
import { GDAXFeedConfig, GDAXExchangeAPI, GDAX_WS_FEED, GDAX_API_URL, GDAXFeed, ExchangeFeed } from 'gdax-tt/build/src/exchanges';
import { Big, BigJS, ZERO } from 'gdax-tt/build/src/lib/types';
import { LiveBookConfig, LiveOrderbook, PlaceOrderMessage, TradeExecutedMessage, TradeFinalizedMessage, MyOrderPlacedMessage, Trigger, TickerMessage, StreamMessage, SnapshotMessage } from 'gdax-tt/build/src/core';
import { DefaultAPI, getSubscribedFeeds,FeedFactory } from 'gdax-tt/build/src/factories/gdaxFactories';

chalk.enabled=true;
const result = dotenv.config();
var input = process.stdin;
input.setEncoding('utf-8'); 
const spread = Big('0.15');
const logger = GTT.utils.ConsoleLoggerFactory({level: 'error'});

//process.on('UnhandledPromiseRejectionWarning', () => {});

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

function loadTicker(product: string) {
    const [base, quote] = product.split('-');

    const options: GDAXConfig = {
        logger: logger,
        apiUrl: process.env.GDAX_API_URL || 'https://api.gdax.com',
        auth: {
            key: process.env.GDAX_KEY,
            secret: process.env.GDAX_SECRET,
            passphrase: process.env.GDAX_PASSPHRASE
        }
    };
  
    getSubscribedFeeds(options, [product]).then((feed: GDAXFeed) => {
        const config: LiveBookConfig = {
        product: product,
        logger: logger
        };
        const book = new LiveOrderbook(config);
    
        book.on('data',()=>{});
        book.on('LiveOrderbook.snapshot', () => {
        // setInterval(()=>{
        //  // console.log(DefaultAPI(logger));
        //  console.log(printStats(book));
        // },2000);
        });
        console.log('TICKER');
        book.on('LiveOrderbook.ticker', (ticker: Ticker) => {
        //console.log(printTicker(product,ticker));
        setInterval(()=>{
            console.log(printStats(book));

        },2000)
       // console.log(printStats(book));
        });
        feed.pipe(book);
        getUserKey();
    }).catch(function(err){console.log('ERROR',err)})
}

function padString(str: string, size: number): string {
  return size - str.length > 0 ? str + new Array(size - str.length + 1).join(' ') : str;
}

function printStats(book: LiveOrderbook) {
  return `${chalk.red('|')}${padfloat(book.state().asks[0].totalSize,5,4)} ${book.state().asks[0].price}`
       +`\t${chalk.green('|')}${padfloat(book.state().bids[0].totalSize,5,4)} ${book.state().bids[0].price}` ;
}

function printOrder(order: LiveOrder) {
  return `${order.side === 'buy' ? chalk.green(order.side) : chalk.red(order.side)}\t${order.size}
  \t${order.price}\t${chalk.dim(order.status)}\t${chalk.dim(order.id)}`;
}

function printTicker(product:string, ticker: Ticker, quotePrec: number = 2): string {
  return `${chalk.yellow(product)}${padfloat(ticker.price, 10, quotePrec)} | sequence: ${ticker.trade_id ? ticker.trade_id : 'N/A'}`;  
}

function getUserKey(){
    input.setRawMode(true);
    var str;
    input.on('data', function (key) {
    //   if(key.includes('b'||'B')){
    //     logger.log('info',`Set Buy Limit`)
    //     str = key.split(' ');
    //     console.log(str.length);
    //     var i;
    //     for(i =1; i < str.length; i++){
    //       // console.log(chalk.blueBright(str[i]));
    //     }
    // }
    if(key=='2'){console.log('works')}
    if(key === 'l'){console.log('Balances',loadBalances())}
    if(key ==='q'){console.log('exit');process.exit()};
    if(key ==='\u0003'){console.log('exit');process.exit()}
    });
}

function loadBalances() {
  gdax.loadBalances().then((token) => {
      console.log(token);
  }).catch((err) => {console.log('ERROR',err);});}

function loadOrders(product : string){
  gdax.loadAllOrders(product).then((orders: LiveOrder[]) => {
      console.log(chalk.dim('side\tsize\tprice\ttime\t\tstatus\torderId'));
      orders.forEach(order => {
        console.log(printOrder(order));
      })
  })
}

loadTicker('BCH-USD')

function limitOrderBuy(product: string, price: string, size: string){
  const order: PlaceOrderMessage ={
      type: 'placeOrder',
      time: new Date(),
      productId: product,
      side: 'buy',
      orderType: 'limit',
      price: price,
      postOnly: true, //maker: true, maker||taker: false 
      size: size,
    };

    gdax.placeOrder(order).then((liveOrder: LiveOrder)=>
    {
        console.log(liveOrder)
    })
}
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

// function setDoubleLimitOrder(){}  

// loadTicker('BCH-USD')