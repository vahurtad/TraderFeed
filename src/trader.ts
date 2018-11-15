import inquirer = require('inquirer');
import chalk from 'chalk';
import * as prompt from './prompts';
// import Comparator from './util/Comparator';
import * as moment from 'moment';
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

// const comparator = new Comparator();
const spread = {
  bestBid: '',
  bestAsk: ''
};
const before = {
  ask: 0,
  bid: 0,
  target: '',
  stop: ''
};

// only one product avaiable to trade
const PRODUCT_ID = 'BCH-USD';

/*
* executes user order
* while not holding, buy and execute double sided order
* if current price > target then set at best ask
* if stop did not execute, then sell @ market?
*/
function set_Limit_Buy_to_Double(current, user) {
  // user.price,user.size,user.target,user.stop
  // buy at target as maker 
  limitOrderBuy(current.ticker,user.size);
  // wait for order message
  // execute double sided order
  // needs to be changed to check if order was executed and not price equality
  // console.log('=',comparator.equal((Number(currentPrice), parseFloat(user.price))));
  if (Number(current.ticker) >= parseFloat(user.price)) {
    // if order executed, then trigger doublesided order
    console.log('trigger double sided order');
    // get_Double_Sided();
    // set double sided order
  } else
  // if order did not execute and price <= 
  if (Number(current.ticker) <= parseFloat(user.price)) {
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
* while holding, sell within range [price assest was bought at, target price]
* use threshold to switch from selling at target or stop
* if current price > target price then set at best ask
* if price <= stop loss price, sell @ market(taker)
*/
function set_Double_Sided_Order(current, user) {
  const mytarget = user.target;
  /*
  * change order between stop loss price and target price
  * when current threshold has been reached
  */
  if ((current.ticker)  <= user.thresholdPrice ) {
    // order limit using Stop Loss Price
    if (user.stop !== before.stop) {
      before.stop = user.stop;
      // make order here
      console.log(' order limit as Stop Loss Price', chalk.bgWhite.bold.magenta(user.stop));
      limitOrderSell(user.stop, user.size);
    } else
    if ((current.ticker) >= user.stop ) {
      // wait for oder to execute
      console.log(' Stop Loss Price Executed', user.stop);
      process.exit();
    }
  } else
  if (current.ticker > user.thresholdPrice ) {
    if ( user.target !== before.target) {
      before.target = user.target;
      // make order here
      console.log(' order limit as Target Price', chalk.bgWhite.bold.magenta(user.target));
      limitOrderSell(user.stop, user.size);
    } else
    if (current.ticker === parseFloat(user.target) ) {
      // if order not executed use spread
      (current.spread > 0.01)
      ?
      user.target = current.ask - .01
      :
      user.target = current.ask;

      if ( user.target !== before.target) {
        before.target = user.target;
        // make order here
        console.log(' order limit as Target Price', chalk.bgWhite.bold.magenta(user.target));
        limitOrderSell(user.stop, user.size);
      } else
      if (current.ticker > parseFloat(user.target) ) {
        console.log(current.ticker , parseFloat(user.target) );
        // wait for oder to execute
        console.log(' Target Price Executed', user.target);
        process.exit();
      }
    }
  }
}

/* 
* gets user input
*/
function get_Double_Sided() {
  // executes when holding
  inquirer.prompt(prompt.doubleSidedPrompt).then( (params) => {
    get_Threshold_Price(params);
    loadTick('2',params);
  });
}

// executes user order
function set_Limit_Buy(current, user) {
  // buy at best bid
  // lower the better

  /*
  * only change order when current target has changed
  */
  if (current.bid.valueOf() !== before.bid.valueOf()) {
    before.bid = current.bid;
    // before.bid = Math.min(bestBid, before.bid);
    console.log(before.bid);
  }

  // limitOrderBuy(bestBid)
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
function set_Limit_Sell(current, user) {
  // sell at best ask
  // higher the better
  if (current.ask.valueOf() !== before.ask.valueOf() ) {
    before.ask = current.ask;
    // before.bid = Math.min(bestBid, before.bid);
    console.log(before.ask);
  } else {
    console.log('no change', current.ask);
  }
  // limitOrderSell()
}
// gets user input
function get_Limit_Sell_Change() {
  // sell at best ask as it changes
  // resets order as best ask changes
  inquirer.prompt(prompt.limitSellAskPrompt).then((params) => {
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
  let current = {};
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
      console.log(`${chalk.green('💰 ')} ${currentTicker.toFixed(2)} ${chalk.green(' 💰')} `);
    });
    book.on('LiveOrderbook.update', (msg: LevelMessage) => {
      const highestBid = book.book.highestBid.price.toFixed(2);
      const lowestAsk = book.book.lowestAsk.price.toFixed(2);
      const newSpread = (Number(lowestAsk) - Number(highestBid)).toFixed(2);
      const newTicker = currentTicker.toFixed(2);

      if (highestBid.valueOf() !== spread.bestBid.valueOf() || lowestAsk.valueOf() !== spread.bestAsk.valueOf()) {
        spread.bestBid = highestBid;
        spread.bestAsk = lowestAsk;
        currentAsk = parseFloat(spread.bestAsk);
        currentBid = parseFloat(spread.bestBid);
        current = {ask: currentAsk, bid: currentBid, spread: parseFloat(newSpread), ticker: parseFloat(newTicker)};
        console.log(`${chalk.green('|BID')} ${spread.bestBid} ${chalk.red('|ASK')} ${spread.bestAsk}`);
        // console.log(`${chalk.green('|')} ${spread.bestBid} ${chalk.red('|')} ${spread.bestAsk}`);
        switch (isMenu) {
          case '1' : set_Limit_Buy_to_Double(current,params); break;
          case '2' : set_Double_Sided_Order(current,params); break;
          case '3' : set_Limit_Buy(current,params); break; // 
          case '4' : set_Limit_Sell(current,params); break; //
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
        console.log();
        console.log(`${chalk.greenBright(order.status.toUpperCase())}${chalk.greenBright(' ORDERS')}`);
        console.log(`${chalk.blueBright(order.productId)}\t${order.extra.type}`);
        console.log(moment(order.extra.created_at).format('MMMM DD h:mm a'));
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

/**
 * Only one of `size` and `funds` are required for market and limit orders (the other can be explicitly assigned null or undefined). However,
 * it is advisable to include both. If funds is not specified, the entire user balance is placed on hold until the order is filled which
 * will prevent other orders from being placed in the interim. This can cause issues for HFT algorithms for example.
 * https://github.com/coinbase/gdax-tt/issues/199
 */
function placeOrder(order: PlaceOrderMessage) {
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
* HELPER FUNCTIONS
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

function get_Threshold_Price(params) {
  const difference = params.target - params.stop;
  const thresholdPrice = Number(difference * params.threshold) + Number(params.stop);
  params.thresholdPrice = thresholdPrice;

  console.log(chalk.bgWhite.red('Threshold Price'), chalk.red(params.thresholdPrice));
}

// function get_Max_Funds() {

// }

/******************************************************************************************
* MAIN PROMPT CALL
*******************************************************************************************/
inquirer.prompt(prompt.feedQ).then( (ans) => {
  if (hasAuth()) {
    switch (ans.choice) {
      case 'Account' : gotoAccountMenu(); break;
      case 'Limit Buy + DSO': get_Limit_Buy(); break;
      case 'Double Sided Order': get_Double_Sided(); break;
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
