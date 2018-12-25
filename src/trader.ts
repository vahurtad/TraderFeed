import inquirer = require('inquirer');
import chalk from 'chalk';
import * as prompt from './prompts';
import { before, PRODUCT_ID, COIN, THRESHOLD_PRICE } from './constants';
import * as moment from 'moment';
import { PlaceOrderMessage } from 'gdax-tt/build/src/core/Messages';
import { LiveOrder } from 'gdax-tt/build/src/lib';
import { loadTick } from './Feeds';
import {
  getAndPrintOrderbook,
  printBalances,
  hasAuth,
  getAndPrintTickers,
  get_Asset_Size,
  get_Threshold_Price,
  getFlooredFixed } from './helpers';
import { gdaxAPI } from './configs';
require('dotenv').config();

// const ctx = new chalk.constructor({level: 3});
// level: 3 enables TrueType Color

export function triggerHelper(isMenu, type: string, current, params) {
  switch (isMenu) {
    case '0': break;
    case '1': finalized_LBtoDS(before.message, before.id , current, params); break;
    case '2': finalized_DS(before.message, before.id , current, params); break;
    case '3': break;
    case '4': break;
    default: console.log('Sorry unable to find menu item. Try again!');
  }
}

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
    if (entry >= ask) {
      console.log(chalk.red(`Entry needs to be < Smallest Ask: ${ask}`));
      console.log(chalk.yellow(`Please enter a entry price`));
      get_Limit_Buy_to_DS();
    } else {
      console.log(chalk.red(`Smallest Ask: ${ask}`));
      inquirer.prompt(prompt.limitBuytoDSPrompt).then( (params) => {
        params.entry = entry;
        console.log('Entry Price:', chalk.green(params.entry));
        return get_Threshold_Price(params);
      }).then((params) => {
        return get_Asset_Size(params, 'buy');
      }).then((params) => {
        // "ERROR: size is too accurate."
        params.size = getFlooredFixed((params.size / Number(params.entry)),8);
        loadTick('1',params);
      });
    }
  });
}

export function finalized_LBtoDS(message, orderIdToFulfill, current, user) {
  // wait for order message OR check funds
  console.log('orderIdToFulfill', orderIdToFulfill);
  console.log('message',message);
  if (message.type === 'tradeFinalized' && message.reason === 'filled') {
    console.log(message.id, orderIdToFulfill);
    if (message.id === orderIdToFulfill) {
      console.log('Entry Price Executed', user.entry);
      set_Double_Sided_Order(current, user);
    }
  }
}
/*
* executes user order
* while not holding, buy and execute double sided order
* if current price > target then set at best ask
* if stop did not execute, then sell @ market?
*/
export function set_Limit_Buy_to_Double(message,current, user) {
  console.log(current.ticker >= Number(user.target), current.ticker , user.target);
  // buy at target as maker 
  if (Number(user.entry) !== Number(before.entry)) {
    console.log('setting limit order');
    before.entry = user.entry;
    limitOrderBuy(user.entry, user.size);
  } else
  if (current.ticker === Number(user.stop)) {
    if (user.stop !== before.stop) {
      before.stop = user.stop;
      // make order here
      marketOrderSell(user.size);
      process.exit();
    }
  }
  // else
  // if (current.ticker >= Number(user.target)) {
  //   console.log('simulation -- trade finalized');
  //   before.id = '';
  //   set_Double_Sided_Order(current, user);
  // }
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

export function finalized_DS(message, orderIdToFulfill, current, user) {
  // wait for order message OR check funds
  console.log('hereeeee',message.side);
  console.log('orderIdToFulfill', orderIdToFulfill);
  if (message.type === 'tradeFinalized' && message.reason === 'filled') {
    console.log(message.id, orderIdToFulfill);
    if (message.id === orderIdToFulfill) {
      console.log('Entry Price Executed', user.entry);
      process.exit();
    }
  }
}

/*
* executes user order
* while holding, sell within range [price asset was bought at, target price]
* use threshold to switch from selling at target or stop
* if current price > target price then set at best ask
* if price <= stop loss price, sell @ market(taker)
*/
export function set_Double_Sided_Order(current, user) {
  const mytarget = user.target;
  console.log('--------- DOUBLE SIDED ORDER -------');
  /*
  * change order between stop loss price and target price
  * when current threshold has been reached
  */
  console.log('current',current,'user',user);
  if (current.ticker > user.thresholdPrice && current.ticker <= user.target ) {
    if (user.target !== before.target) {
      before.target = user.target;
      // make order here
      console.log('order limit as Target Price', chalk.bgYellow.bold.black(user.target));
      limitOrderSell(user.target, user.size);
    }
  } else
  if (current.ticker > user.target) {
    if (current.bid >= user.target && current.spread > 0.01) {
      user.target = current.ask - .01;
    } else
    if (current.spread <= 0.01) {
      user.target = current.ask;
    }
    if (user.target !== before.target) {
      before.target = user.target;
      console.log(' order limit as Target Price', chalk.bgWhite.bold.yellow(user.target));
      limitOrderSell(user.target, user.size);
    }
  } else
  if ((current.ticker) <= user.thresholdPrice ) {
    // limbo
    // order limit using Stop Loss Price
    if (user.stop !== before.stop) {
      before.stop = user.stop;
      // make order here
      console.log(chalk.yellow.underline('Stop Order Executed', chalk.bgWhite.bold.yellow(user.stop)));
      stopOrderSell(user.stop,user.size);
      process.exit();
    }
  } else
  if (current.ticker === user.target) {
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
      limitOrderSell(user.target, user.size);
    }
  }
}

// gets user input
function get_Limit_Buy_Change() {
  // buy at best bid as it changes
  // resets order as best bid changes
  inquirer.prompt(prompt.limitBuyBidPrompt).then((params) => {
    return getAndPrintTickers().then((v) => {
      return [v.bid.toNumber().toFixed(2), params];
    });
  }).then((v) => {
    const [bid,params] = v;
    params.entry = bid;
    return get_Asset_Size(params, 'buy');
  }).then((params) => {
    params.size = getFlooredFixed((Number(params.size) / Number(params.entry)),8);
    return params;
  }).then((params) => {
    loadTick('3',params);
  });
}

export function LB_helper(message,current, user) {
  console.log("​checking -> message.id", message.id);
  console.log("​checking -> before.id", before.id);
  if (current.bid !== before.bid) {
    before.bid = current.bid;
    console.log('>>making new order<<');
		console.log("​exportfunctionLB_helper -> message.id", message.id);
    console.log("​exportfunctionLB_helper -> before.id", before.id);
    limitOrderBuy(before.bid.toString(), user.size);
    console.log("​exportfunctionLB_helper -> message.id", message.id);
    // gdaxAPI.cancelOrder(before.id).then((order) => {
    //   console.log(`SUCCESS ${chalk.red('CANCELLED',before.id)}`);
    // }).catch((err) => {
    //   console.log('error', err);
    // });
    
    before.id = message.id;
    console.log("​exportfunctionLB_helper -> before.id", before.id);
    console.log('-------------');
  }
}

// executes user order
export function set_Limit_Buy(current, user) {
  /*
  * only change order when current target has changed
  */
  if (before.bid !== Number(user.entry)) {
    before.bid = Number(user.entry);
    console.log(before.bid);
    console.log("​exportfunctionset_Limit_Buy -> before.bid", before.bid);
    limitOrderBuy(before.bid.toString(), user.size);
  }
}

// gets user input
function get_Limit_Sell_Change() {
  // sell at best ask as it changes
  // resets order as best ask changes
  inquirer.prompt(prompt.limitSellAskPrompt).then((params) => {
    return getAndPrintTickers().then((v) => {
      return [v.ask.toNumber().toFixed(2), params];
    });
  }).then((v) => {
    const [ask,params] = v;
    params.entry = ask;
    return get_Asset_Size(params, 'buy');
  }).then((params) => {
    params.size = getFlooredFixed((Number(params.size) / Number(params.entry)),8);
    return params;
  }).then((params) => {
    loadTick('4',params);
  });
}

export function LS_helper(message,current, user) {
  if (current.bid !== before.bid) {
    gdaxAPI.cancelOrder(before.id).then((order) => {
      console.log(`SUCCESS ${chalk.red('CANCELLED')}`);
    }).catch((err) => {
      console.log('error', err);
    });
    before.bid = current.bid;
    limitOrderSell(before.bid.toString(), user.size);
  } else {
    console.log('no change', current.bid);
  }
}
// executes user order
export function set_Limit_Sell(current, user) {
  // sell at best ask
  // higher the better
  if (before.bid !== Number(user.entry)) {
    before.bid = Number(user.entry);
    console.log(before.bid);
    limitOrderSell(before.bid.toString(), user.size);
  }
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
  console.log(`Cancelling all open orders for ${COIN}`);
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
  console.log('-->>>',order.orderType, order.side);
  const msg = chalk.red(`PLACED: Limit ${order.side} order for ${order.size} at ${order.price}`);
  gdaxAPI.placeOrder(order).then((liveOrder: LiveOrder) => {
    console.log('SUCCESS',msg);
  }).catch((err) => {
      console.log('ERROR',err);
  });
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
function stopOrderBuy(price: string, size: string) {
  // taking from order book
  const order: PlaceOrderMessage = {
    type: 'placeOrder',
    time: new Date(),
    productId: PRODUCT_ID,
    side: 'buy',
    orderType: 'stop',
    price: price,
    size: size,
    postOnly: true
  };
  placeOrder(order);
}
function stopOrderSell(price: string, size: string) {
  // taking from order book
  const order: PlaceOrderMessage = {
    type: 'placeOrder',
    time: new Date(),
    productId: PRODUCT_ID,
    side: 'sell',
    orderType: 'stop',
    price: price,
    size: size,
    postOnly: true
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
      case 'Cancel All Orders': cancelOrders(); break;
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
