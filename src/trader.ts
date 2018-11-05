import inquirer = require('inquirer');
import chalk from 'chalk';
import * as prompt from './prompts';
import * as GTT from 'gdax-tt';
import { padfloat } from 'gdax-tt/build/src/utils';
import { LiveBookConfig, LiveOrderbook, LevelMessage, SkippedMessageEvent } from 'gdax-tt/build/src/core';
import { GDAXConfig } from 'gdax-tt/build/src/exchanges/gdax/GDAXInterfaces';
import { PlaceOrderMessage } from 'gdax-tt/build/src/core/Messages';
import { GDAXExchangeAPI, GDAX_API_URL, GDAXFeed } from 'gdax-tt/build/src/exchanges';
import { Ticker } from 'gdax-tt/build/src/exchanges/PublicExchangeAPI';
import { getSubscribedFeeds } from 'gdax-tt/build/src/factories/gdaxFactories';
import { ZERO } from 'gdax-tt/build/src/lib/types';
import { LiveOrder } from 'gdax-tt/build/src/lib';
require('dotenv').config();

const spread = {
  bestBid: '',
  bestAsk: ''
};
const before = {
  ask: '',
  bid: '',
  target: ''
};
const PRODUCT_ID = 'BCH-USD';

/*
* executes user order
* while not holding, buy and execute double sided order
* if current price > target then set at best ask
* if stop did not execute, then sell @ market?
*/
function set_Limit_Buy_to_Double(currentPrice, bestAsk, params) {
  // params.price,params.size,params.target,params.stop
  // buy at target as maker 
  limitOrderBuy(params.price,params.size);
  // wait for oder message
  // execute double sided order
  // needs to be changed to check if order was executed and not price equality
  if (Number(currentPrice) === parseFloat(params.price)) {
    // if order executed, then trigger doublesided order
    console.log('trigger double sided order');
    get_Double_Sided();
  } else
  // if order did not execute and price <= stop
  if (Number(currentPrice) <= parseFloat(params.stop)) {
    // cancel order
    // do nothing because it did not buy
    cancelOrders();
    // exit
    process.exit();
  }
}

/* 
* gets user input
* to buy and use double sided order
*/
function get_Limit_Buy() {
  inquirer.prompt(prompt.limitBuyPrompt).then( (params) => {
    console.log('Price to Buy:', chalk.green(params.price));
    loadTick('1',params);
  });
}

/*
* executes user order
* while holding, first sell within range [target or stop]
* if current price > target then set at best ask
* if price <= stop, sell @ market(taker)
*/
function set_Double_Sided_Order(currentPrice, bestAsk, params) {
  const mytarget = params.target;
  /*
  * only change order when current target has changed
  * console.log(best_ask,target,mytarget)
  */
  params.target = Math.max(bestAsk, params.target, mytarget);
  // check if target has changed
  if (params.target.valueOf() !== before.target.valueOf()) {
    console.log('target changed', chalk.cyan(params.target));
    before.target = params.target;
    if (Number(currentPrice) === params.target) {
      console.log('target reached');
      // check if order executed
      // exit if order is done
    } else
    if (Number(currentPrice) <= parseFloat(params.stop)) {
      // cancel order  
      cancelOrders();
      // sell as taker at current price of ticker
      console.log('sell as taker', params.stop);
      // need to have a spread for selling
      // sells according to set size
      // need prompt here asking to sell all or an amount
      marketOrderSell(params.size);
      // complete sell
      process.exit();
      // set order  
    }
  } else
  // not necessary
  if (params.target.valueOf() === before.target.valueOf()) {
    // do nothing
    // console.log('same', target)
  }
}

/* 
* gets user input
*/
function get_Double_Sided() {
  // executes when holding
  inquirer.prompt(prompt.doubleSidedPrompt).then( (params) => {
    loadTick('2',params);
  });
}

// executes user order
function set_Limit_Buy(currentPrice, bestBid, params) {
  // buy at best bid
}
// gets user input
function get_Limit_Buy_Change() {
  // buy at best bid as it changes
  // resets order as best bid changes
  inquirer.prompt(prompt.limitBuyBidPrompt).then((params) => {
    loadTick('3',params);
  });
}

// executes user order
function set_Limit_Sell(currentPrice,bestAsk, params) {
  // sell at best ask
}
// gets user input
function get_Limit_Sell_Change() {
  // sell at best ask as it changes
  // resets order as best ask changes
  inquirer.prompt(prompt.limitBuyAskPrompt).then((params) => {
    loadTick('4',params);
  });
}

/******************************************************************************************
* GDAX FUNCTIONS
*******************************************************************************************/
const logger = GTT.utils.ConsoleLoggerFactory({level: 'error'});
const gdaxConfig: GDAXConfig = {
  logger: logger,
  apiUrl: GDAX_API_URL || 'https://api.gdax.com',
  auth: {
    key: process.env.GDAX_KEY,
    secret: process.env.GDAX_SECRET,
    passphrase: process.env.GDAX_PASSPHRASE
  }
};
const gdaxAPI = new GDAXExchangeAPI(gdaxConfig);

function hasAuth(): boolean {
  if (gdaxAPI.checkAuth()) {
    console.log('Authenticated.');
    return true;
  }
  console.log('No authentication credentials were supplied, so cannot fulfil request');
  return false;
}

function getBalances() {
  gdaxAPI.loadBalances().then((balances) => {
    for (const b in balances) {
      for (const c in balances[b]) {
        if (c === 'USD') {
          /*
          * balance - total funds in the account
          * available - funds available to withdraw or trade
          */
          console.log('💵 USD 💵');
          console.log(`balance: ${balances[b][c].balance.toNumber()} -- available: ${balances[b][c].available.toNumber()}`);
        }
      }
    }
  }).catch((err) => {
    console.log('error', err);
  });
}

/******************************************************************************************
* FEEDS
*******************************************************************************************/
function loadTick(isMenu, params) {
  let currentTicker = ZERO;
  let currentAsk = 0;
  let currentBid = 0;
  let bid = 0;
  getSubscribedFeeds(gdaxConfig, [PRODUCT_ID]).then((feed: GDAXFeed) => {
    const config: LiveBookConfig = {
      product: PRODUCT_ID,
      logger: logger
    };
    const book = new LiveOrderbook(config);
    // register to liveorderbook events
    book.on('data',() => {
      // https://github.com/coinbase/gdax-tt/issues/110
      // listening to 'data' event, all data remain in memory
      // force stream in flowing state
    });
    book.on('LiveOrderbook.ticker', (ticker: Ticker) => {
      currentTicker = ticker.price;
      console.log(`${chalk.green('💰 ')} ${ticker.price.toFixed(2)} ${chalk.green(' 💰')} `);
    });
    book.on('LiveOrderbook.update', (msg: LevelMessage) => {
      const highestBid = book.book.highestBid.price.toFixed(2);
      const lowestAsk = book.book.lowestAsk.price.toFixed(2);
      if (highestBid.valueOf() !== spread.bestBid.valueOf() || lowestAsk.valueOf() !== spread.bestAsk.valueOf()) {
        spread.bestBid = highestBid;
        spread.bestAsk = lowestAsk;
        currentAsk = parseFloat(spread.bestAsk);
        currentBid = parseFloat(spread.bestBid);
        bid = parseFloat(spread.bestBid);
        console.log(`${chalk.green('|')} ${spread.bestBid} ${chalk.red('|')} ${spread.bestAsk}`);
        switch (isMenu) {
          case '1' : set_Limit_Buy_to_Double(currentTicker,currentAsk,params); break;
          case '2' : set_Double_Sided_Order(currentTicker,currentAsk,params); break;
          case '3' : set_Limit_Buy(currentTicker,currentAsk,params); break;
          case '4' : set_Limit_Sell(currentTicker,currentAsk,params); break;
          default: console.log('Sorry unable to find menu item. Try again!');
        }
      }
    });
    book.on('LiveOrderbook.skippedMessage', (details: SkippedMessageEvent) => {
      // On GDAX, this event should never be emitted, but we put it here for completeness
      logger.log('error','SKIPPED MESSAGE', details);
      logger.log('error','Reconnecting to feed');
      feed.reconnect(0);
    });
    book.on('end', () => {
      logger.log('info', 'Orderbook closed');
    });
    book.on('error', (err) => {
      logger.log('error', 'Livebook errored: ', err);
      feed.pipe(book);
    });
    feed.pipe(book);
  }).catch((err) => {
    console.log('ERROR',err);
  });
}

/******************************************************************************************
* ORDER FUNCTIONS
*******************************************************************************************/
function getOrders() {
  gdaxAPI.loadAllOrders(PRODUCT_ID).then((orders) => {
    if (orders.length === 0) {
      console.log(chalk.redBright('No orders'));
    } else {
      orders.forEach((order: LiveOrder) => {
        console.log(`${chalk.greenBright(order.status.toUpperCase())}${chalk.greenBright(' ORDERS')}`);
        console.log(`${order.productId}\t${order.extra.type}`);
        console.log(`${order.extra.side}\t${order.size.toNumber()}`);
        console.log(`${'stop '}${order.extra.stop}\t${order.extra.stop_price}`);
      });
    }
  }).catch((err) => {
    console.log('error', err);
  });
}
function cancelOrders() {
  console.log('Cancelling open orders...');
  gdaxAPI.cancelAllOrders(PRODUCT_ID).then((orders: string[]) => {
    orders.forEach((order: string) => {
      console.log(order);
    });
  }).catch((err) => {
    console.log('error', err);
  });
}
function placeOrder(order: PlaceOrderMessage) {
  // this places order message 
  const msg = `Limit ${order.side} order for ${order.size} at ${order.price}`;
  // gdaxAPI.placeOrder(order).then((liveOrder: LiveOrder) => {
  //     console.log(liveOrder);
  //     console.log(msg);
  // }).catch((err) => {
  //     console.log('ERROR',err);
  // });
  console.log(msg);
}
function limitOrderBuy(price: string, size: string) {
  // placing on order book
  const order: PlaceOrderMessage = {
    type: 'placeOrder',
    time: new Date(),
    productId: PRODUCT_ID,
    side: 'buy',
    orderType: 'limit',
    price: price,
    postOnly: true, // maker: true, maker||taker: false 
    size: size,
  };
  placeOrder(order);
}
function limitOrderSell(price: string, size: string) {
  // placing on order book
  const order: PlaceOrderMessage = {
    type: 'placeOrder',
    time: new Date(),
    productId: PRODUCT_ID,
    side: 'sell',
    orderType: 'limit',
    price: price,
    postOnly: true, // maker: true, maker|taker: false 
    size: size,
  };
  placeOrder(order);
}
function marketOrderBuy(size: string) {
  // taking from order book
  const order: PlaceOrderMessage = {
    type: 'placeOrder',
    time: new Date(),
    productId: PRODUCT_ID,
    side: 'buy',
    orderType: 'market',
    size: size,
  };
  placeOrder(order);
}
function marketOrderSell(size: string) {
  // taking from order book
  const order: PlaceOrderMessage = {
    type: 'placeOrder',
    time: new Date(),
    productId: PRODUCT_ID,
    side: 'sell',
    orderType: 'market',
    size: size,
  };
  placeOrder(order);
}

/******************************************************************************************
* PRINT FUNCTIONS
*******************************************************************************************/
function printTicker(ticker: Ticker, quotePrec: number = 2): string {
  return `${padfloat(ticker.price, 10, quotePrec)}`;
}

function printStats(book: LiveOrderbook) {
  let bestBid = book.state().bids[0].price;
  const oldBid = bestBid;
  bestBid = book.state().bids[0].price;
  console.log(`${bestBid}  ${oldBid}`);
}

/******************************************************************************************
* MAIN PROMPT CALL
*******************************************************************************************/
inquirer.prompt(prompt.feedQ).then( (ans) => {
  if (hasAuth()) {
    switch (ans.choice) {
      case 'Account' : gotoAccountMenu(); break;
      case 'Limit Buy - User':  get_Limit_Buy(); break;
      case 'Double Sided Order':  get_Double_Sided(); break;
      case 'Limit Buy - Best Bid': get_Limit_Buy_Change(); break;
      case 'Limit Sell - Best Ask': get_Limit_Sell_Change(); break;
      case 'exit': console.log(chalk.cyan('Good Bye 👋\n')); process.exit(); break;
      default:  console.log('Sorry, no menu item for that');
    }
  }
});

function gotoAccountMenu() {
  inquirer.prompt(prompt.accountMenu).then( (ans) => {
    switch (ans.more) {
      case 'Balances': getBalances(); break;
      case 'Orders': getOrders(); break;
      default:  console.log('Sorry, no menu item for that');
    }
  });
}
