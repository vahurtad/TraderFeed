import inquirer = require('inquirer');
import chalk from 'chalk';
import * as prompt from './prompts';
import { spread, before, PRODUCT_ID, THRESHOLD_PRICE } from './constants';
import * as moment from 'moment';
import * as GTT from 'gdax-tt';
import { padfloat } from 'gdax-tt/build/src/utils';
import { LiveBookConfig, LiveOrderbook, LevelMessage, SkippedMessageEvent } from 'gdax-tt/build/src/core';
import { GDAXConfig } from 'gdax-tt/build/src/exchanges/gdax/GDAXInterfaces';
import {
  CancelOrderRequestMessage,
  ErrorMessage,
  PlaceOrderMessage,
  StreamMessage,
  TradeMessage,
  TickerMessage,
  TradeExecutedMessage,
  TradeFinalizedMessage,
  OrderbookMessage,
  MyOrderPlacedMessage } from 'gdax-tt/build/src/core/Messages';
import { GDAXExchangeAPI, GDAX_API_URL, GDAXFeed } from 'gdax-tt/build/src/exchanges';
import { Trader, TraderConfig } from 'gdax-tt/build/src/core/Trader';
import { PublicExchangeAPI, Ticker } from 'gdax-tt/build/src/exchanges/PublicExchangeAPI';
import { getSubscribedFeeds } from 'gdax-tt/build/src/factories/gdaxFactories';
import { ZERO } from 'gdax-tt/build/src/lib/types';
import { LiveOrder } from 'gdax-tt/build/src/lib';
import { Balances } from 'gdax-tt/build/src/exchanges/AuthenticatedExchangeAPI';
require('dotenv').config();

// const ctx = new chalk.constructor({level: 3});
// level: 3 enables TrueType Color

/* 
* gets user input
* to buy and use double sided order
*/
function get_Limit_Buy_to_DS() {
  inquirer.prompt(prompt.entryPrompt).then( (param) => {
    return getAndPrintTickers().then((v) => {
      return [v.ask.toNumber().toFixed(2), param.entry];
    });
  }).then((v) => {
    const [ask,entry] = v;
    if (entry > ask) {
      console.log(chalk.red(`Entry Price is bigger than Smallest Ask: ${ask}`));
      console.log(chalk.yellow(`Please enter a entry price`));
      get_Limit_Buy_to_DS();
    } else {
      console.log(chalk.red(`Smallest Ask: ${ask}`));
      inquirer.prompt(prompt.limitBuytoDSPrompt).then( (params) => {
        params.entry = entry;
        console.log('Entry Price:', chalk.green(params.entry));
        return get_Threshold_Price(params);
      }).then((params) => {
        return get_Asset_Size(params);
      }).then((params) => {
        loadTick('1',params);
      });
    }
});
}

/*
* executes user order
* while not holding, buy and execute double sided order
* if current price > target then set at best ask
* if stop did not execute, then sell @ market?
*/
function set_Limit_Buy_to_Double(current, user) {
  // buy at target as maker 
  if ( user.entry !== before.entry) {
    before.entry = user.entry;
    limitOrderBuy(user.entry, user.size);
  }
  // wait for order message OR check funds
  if ((current.ticker) < user.entry ) {
    console.log('here',before.entry);
    console.log('Entry Price Executed', user.entry);
    // execute double sided order
    console.log(chalk.yellow('Executing DSO'));
    set_Double_Sided_Order(current,user);

  } else
  if (current.ticker === user.stop) {
    if (user.stop !== before.stop) {
      before.stop = user.stop;
      // make order here
      marketOrderSell(user.size);
      process.exit();
    }
  }
}

/* 
* gets user input
*/
function get_Double_Sided() {
  // executes when holding
  inquirer.prompt(prompt.doubleSidedPrompt).then((params) => {
    return get_Threshold_Price(params);
  }).then((params) => {
    return get_Asset_Size(params);
  }).then((params) => {
    loadTick('2',params);
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
  if ((current.ticker) === user.thresholdPrice ) {
    // order limit using Stop Loss Price
    if (user.stop !== before.stop) {
      before.stop = user.stop;
      // make order here
      console.log(chalk.yellow.underline('Stop Order Executed', chalk.bgWhite.bold.yellow(user.stop)));
      marketOrderSell(user.size);
      process.exit();
    }
  } else
  if (current.ticker > user.thresholdPrice ) {
    if ( user.target !== before.target) {
      before.target = user.target;
      // make order here
      // console.log('order limit as Target Price', chalk.bgWhite.bold.yellow(user.target));
      limitOrderSell(user.target, user.size);
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
        console.log(' order limit as Target Price', chalk.bgWhite.bold.yellow(user.target));
        limitOrderSell(user.stop, user.size);
      } else
      if (current.ticker > parseFloat(user.target) ) {
        console.log(current.ticker , parseFloat(user.target) );
        console.log(' Target Price Executed', user.target);
        process.exit();
      }
    }
  }
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
function set_Limit_Buy(current, user) {
  // buy at best bid
  // lower the better

  /*
  * only change order when current target has changed
  */
  if (current.bid !== before.bid) {
    before.bid = current.bid;
    // before.bid = Math.min(bestBid, before.bid);
    console.log(before.bid);
  }

  // limitOrderBuy(bestBid)
}

// gets user input
function get_Limit_Sell_Change() {
  // sell at best ask as it changes
  // resets order as best ask changes
  inquirer.prompt(prompt.limitSellAskPrompt).then((params) => {
    loadTick('4',params);
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

/******************************************************************************************
* GDAX FUNCTIONS
*******************************************************************************************/
const logger = GTT.utils.ConsoleLoggerFactory({level: 'error'});
const gdaxConfig: GDAXConfig = {
  logger: logger,
  apiUrl: process.env.COINBASE_API,
  auth: {
    key: process.env.GDAX_KEY,
    secret: process.env.GDAX_SECRET,
    passphrase: process.env.GDAX_PASSPHRASE
  }
};
// console.log(gdaxConfig);

const gdaxAPI = new GDAXExchangeAPI(gdaxConfig);

const publicExchanges: PublicExchangeAPI[] = [gdaxAPI];

function getTickers(exchanges: PublicExchangeAPI[]): Promise<Ticker[]> {
    const promises = exchanges.map((ex: PublicExchangeAPI) => ex.loadTicker(PRODUCT_ID));
    return Promise.all(promises);
}

export function getAndPrintTickers() {
    return getTickers(publicExchanges).then((tickers: Ticker[]) => {
        return tickers[0];
    });
}

function hasAuth(): boolean {
  if (gdaxAPI.checkAuth()) {
    console.log('Authenticated.');
    return true;
  }
  console.log('No authentication credentials were supplied, so cannot fulfil request');
  return false;
}

function getBalances() {
  const balanceANDfunds = [];
  return gdaxAPI.loadBalances().then((balances: Balances) => {
    for (const profile in balances) {
      for (const c in balances[profile]) {
        balanceANDfunds.push({coin: c, funds: balances[profile][c]});
      }
    }
    return balanceANDfunds;
  }).catch((err) => {
    console.log('error', err);
  });
}

function printBalances() {
  getBalances().then((total: any[]) => {
    /*
    * balance - total funds in the account
    * available - funds available to withdraw or trade
    */
    for (const t in total ) {
      if (total[t].funds.balance.toNumber() !== 0  || total[t].funds.available.toNumber() !== 0 ) {
        console.log(`${total[t].coin}\tbalance: ${total[t].funds.balance.toFixed(7)} -- available: ${total[t].funds.available.toFixed(7)}`);
      }
    }
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
    book.on('data',(msg: StreamMessage) => {
      if (msg.type === 'placeOrder') {

        console.log('placeOrder', (msg as PlaceOrderMessage).side);
        console.log(msg);
        console.log((msg as PlaceOrderMessage).price, (msg as PlaceOrderMessage).size);
      }

      if (msg.type === 'myOrderPlaced') {
        console.log('myOrderPlaced', (msg as MyOrderPlacedMessage).side);
        console.log((msg as MyOrderPlacedMessage).price, (msg as MyOrderPlacedMessage).size);
      }

      if (msg.type === 'tradeFinalized') {
        // shows cancelled open orders with reason = canceled
        // shows if order has been filled with reason = filled
        console.log((msg as TradeFinalizedMessage).reason, (msg as TradeFinalizedMessage).time);
        console.log((msg as TradeFinalizedMessage).side, (msg as TradeFinalizedMessage).price);
      }

      if (msg.type === 'tradeExecuted') {
        // happens before a trade is finalized, with a reason =  filled
        console.log('TradeExecutedMessage', (msg as TradeExecutedMessage).time);
        console.log((msg as TradeExecutedMessage).tradeSize, (msg as TradeExecutedMessage).price);
        console.log((msg as TradeExecutedMessage).orderType, (msg as TradeExecutedMessage).side);
      }

      if (msg.type === 'cancelOrder') {
        console.log('cancelOrder', (msg as CancelOrderRequestMessage).time);
        console.log((msg as CancelOrderRequestMessage).orderId.length, 'CANCELLED');
      }
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
  // status:  'open', 'pending', 'active'
  gdaxAPI.loadAllOrders(PRODUCT_ID).then((orders) => {
    if (orders.length === 0) {
      console.log(chalk.redBright('No orders'));
    } else {
      orders.forEach((order: LiveOrder) => {
        console.log(`${chalk.italic.greenBright(order.status.toUpperCase())}${chalk.greenBright(' ORDERS')}`);
        console.log(`${chalk.blueBright(order.productId)}`);
        console.log(chalk.blueBright.bold(moment(order.extra.created_at).format('MMMM DD h:mm a')));
        console.log(`${order.extra.type} ${order.extra.side}\t${order.size.toNumber()} @ $${order.price.toNumber()}`);
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
  console.log(order);
  const msg = chalk.red(`PLACED: Limit ${order.side} order for ${order.size} at ${order.price}`);
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
  if ( params.threshold === '' ) {
    params.threshold = THRESHOLD_PRICE;
  }
  const difference = params.target - params.stop;
  const thresholdPrice = Number(difference * params.threshold) + Number(params.stop);
  params.thresholdPrice = thresholdPrice;

  console.log(chalk.bgWhite.red('Threshold Price'), chalk.red(params.thresholdPrice));
  return params;
}

function get_Asset_Size(params) {
  params.size = params.size.replace(/\s/g,'');
  if (params.size === 'all' || params.size === '' || params.size.length === 0) {
    return getBalances().then((total) => {
      params.size = total[1].funds.balance.toNumber();
      return params;
    });
  } else {
    return params;
  }
}

/******************************************************************************************
* MAIN PROMPT CALL
*******************************************************************************************/
inquirer.prompt(prompt.feedQ).then( (ans) => {
  if (hasAuth()) {
    switch (ans.choice) {
      case 'Account' : gotoAccountMenu(); break;
      case 'Limit Buy + DSO': get_Limit_Buy_to_DS(); break;
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
      case 'Balances': printBalances(); break;
      case 'Orders': getOrders(); break;
      case 'exit': console.log(chalk.cyan('Good Bye 👋\n')); process.exit(); break;
      default:  console.log('Sorry, no menu item for that');
    }
  });
}
