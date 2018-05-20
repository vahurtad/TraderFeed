
import * as program from 'commander';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import * as GTT from 'gdaxtt2';
import { padfloat, printOrderbook } from 'gdaxtt2/build/src/utils';
import { LiveOrder, BookBuilder } from 'gdaxtt2/build/src/lib';
import { Ticker } from 'gdaxtt2/build/src/exchanges/PublicExchangeAPI';
import { GDAXConfig } from 'gdaxtt2/build/src/exchanges/gdax/GDAXInterfaces';
import { GDAXFeedConfig, GDAXExchangeAPI, GDAX_WS_FEED, GDAX_API_URL, GDAXFeed, ExchangeFeed } from 'gdaxtt2/build/src/exchanges';
import { Big, BigJS, ZERO } from 'gdaxtt2/build/src/lib/types';
import { LiveBookConfig, LiveOrderbook, PlaceOrderMessage, TradeExecutedMessage, TradeFinalizedMessage, MyOrderPlacedMessage, Trigger, TickerMessage, StreamMessage, SnapshotMessage } from 'gdaxtt2/build/src/core';
import { DefaultAPI, getSubscribedFeeds } from 'gdaxtt2/build/factories/gdaxFactories';

chalk.enabled=true;
const result = dotenv.config();
var input = process.stdin;
input.setEncoding('utf-8'); 

const spread = Big('0.15');

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
process.on('UnhandledPromiseRejectionWarning', () => {});

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
      //console.log(printStats(book));
    });
    feed.pipe(book);

    input.setRawMode(false);
    var str;
    input.on('data', function (key) {
      if(key.includes('b'||'B')){
        logger.log('info',`Set Buy Limit`)
        str = key.split(' ');
        console.log(str.length);
        var i;
        for(i =1; i < str.length; i++){
          // console.log(chalk.blueBright(str[i]));
        }
    }
    if(key ==='q'){console.log('exit');process.exit()};
    if(key ==='\u0003'){console.log('exit');process.exit()}
    });
  });
}



function padString(str: string, size: number): string {
  return size - str.length > 0 ? str + new Array(size - str.length + 1).join(' ') : str;
}

function printStats(book: LiveOrderbook) {
  return `${chalk.red('|')}${padfloat(book.state().asks[0].totalSize,9,4)}${padfloat(book.ticker.ask,10,2)}`
       +`\t${chalk.green('|')}${padfloat(book.state().bids[0].totalSize,9,4)}${padfloat(book.ticker.price,10,2)}`;
}

function printOrder(order: LiveOrder) {
  return `${order.side === 'buy' ? chalk.green(order.side) : chalk.red(order.side)}\t${order.size}
  \t${order.price}\t${chalk.dim(order.status)}\t${chalk.dim(order.id)}`;
}

function printTicker(product:string, ticker: Ticker, quotePrec: number = 2): string {
  return `${chalk.yellow(product)}${padfloat(ticker.price, 10, quotePrec)} | sequence: ${ticker.trade_id ? ticker.trade_id : 'N/A'}`;  
}

function loadOrders(product : string){
  gdax.loadAllOrders(product).then((orders: LiveOrder[]) => {
      console.log(chalk.dim('side\tsize\tprice\ttime\t\tstatus\torderId'));
      orders.forEach(order => {
        console.log(printOrder(order));
      })
  })
}


function parseOrder(order : string,size : Number, price:Number){
  switch(order){
    case 'lb':{
      console.log(chalk.green('LIMIT BUY'+ size + price));
      break;
      // limitOrderBuy(product,price,size);
    }
    case 'ls':{
      console.log(chalk.red('LIMIT SELL'));
      break;
    }
    case 'mb':{
      console.log(chalk.green('MARKET BUY'));
      break;
      // limitOrderBuy(product,price,size);
    }
    case 'ms':{
      console.log(chalk.red('MARKET SELL'));
      break;
    }
    default:{
      console.log('Nothing to do');
      break;
    }
  }
}

function limitOrderBuy(product: string, price: string, size: string){
  const order: PlaceOrderMessage ={
    type: 'placeOrder',
    time: new Date(),
    productId: product,
    side: 'buy',
    orderType: 'limit',
    price: price,
    postOnly: true, //maker: true, maker|taker: false 
    size: size,
  }
}
function limitOrderSell(product: string, price: string, size: string){
  const order: PlaceOrderMessage ={
    type: 'placeOrder',
    time: new Date(),
    productId: product,
    side: 'sell',
    orderType: 'limit',
    price: price,
    postOnly: true, //maker: true, maker|taker: false 
    size: size,
  }
}

function marketOrderBuy(product: string, price: string, size: string){
  const order: PlaceOrderMessage ={
    type: 'placeOrder',
    time: new Date(),
    productId: product,
    side: 'buy',
    orderType: 'market',
    price: price,
    size: size,
  }
}
function marketOrderSell(product: string, price: string, size: string){
  const order: PlaceOrderMessage ={
    type: 'placeOrder',
    time: new Date(),//null?
    productId: product,
    side: 'sell',
    orderType: 'market',
    price: price,
    size: size,
  }
}

function setDoubleLimitOrder(){}  



loadTicker('BCH-USD')

