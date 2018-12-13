import inquirer = require('inquirer');
import chalk from 'chalk';
import * as prompt from './prompts';
import { before, PRODUCT_ID } from './constants';
import * as moment from 'moment';
import { PlaceOrderMessage } from 'gdax-tt/build/src/core/Messages';
import { LiveOrder } from 'gdax-tt/build/src/lib';
import { loadTick } from './Feeds';
import { printBalances ,hasAuth, getAndPrintTickers, get_Asset_Size, get_Threshold_Price } from './helpers';
import { gdaxAPI } from './configs';
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
export function set_Limit_Buy_to_Double(current, user) {
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
export function set_Double_Sided_Order(current, user) {
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
export function set_Limit_Buy(current, user) {
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
export function set_Limit_Sell(current, user) {
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
* ORDER FUNCTIONS
*******************************************************************************************/
function getOrders() {
  // status: 'open' || 'pending' || 'active'
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
      case 'Watch':  loadTick('0', 0); break;
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
