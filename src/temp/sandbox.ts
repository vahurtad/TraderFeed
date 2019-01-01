import inquirer = require('inquirer');
import chalk from 'chalk';
import * as prompt from '../prompts';
import { spread, before,  THRESHOLD_PRICE } from '../constants';
import * as moment from 'moment';
import * as GTT from 'gdax-tt';
import { padfloat } from 'gdax-tt/build/src/utils';
import { LiveBookConfig, LiveOrderbook, LevelMessage, SkippedMessageEvent } from 'gdax-tt/build/src/core';
import { GDAXConfig } from 'gdax-tt/build/src/exchanges/gdax/GDAXInterfaces';
import { PlaceOrderMessage, TradeExecutedMessage, TradeFinalizedMessage } from 'gdax-tt/build/src/core/Messages';
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
export const PRODUCT_ID = 'BTC-USD';

/******************************************************************************************
* GDAX FUNCTIONS
*******************************************************************************************/
const logger = GTT.utils.ConsoleLoggerFactory({level: 'error'});
const gdaxConfig: GDAXConfig = {
  logger: logger,
  apiUrl: process.env.COINBASE_SANDBOX_API,
  auth: {
    key: process.env.GDAX_PRO_KEY,
    secret: process.env.GDAX_PRO_SECRET,
    passphrase: process.env.GDAX_PRO_PASSPHRASE
  }
};

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
/******************************************************************************************
* FEEDS
*******************************************************************************************/

printBalances();
getOrders();

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

  book.on('data',(v) => {
 
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
  // feed.pipe(trader);
}).catch((err) => {
  console.log('ERROR',err);
});
