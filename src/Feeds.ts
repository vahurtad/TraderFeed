import chalk from 'chalk';
import * as moment from 'moment';
import { getSubscribedFeeds } from 'gdax-tt/build/src/factories/gdaxFactories';
import { GDAXFeed } from 'gdax-tt/build/src/exchanges';
import { LiveBookConfig, LiveOrderbook, LevelMessage, SkippedMessageEvent } from 'gdax-tt/build/src/core';
import { Ticker } from 'gdax-tt/build/src/exchanges/PublicExchangeAPI';
import { spread, before, PRODUCT_ID } from './constants';
import { ZERO } from 'gdax-tt/build/src/lib/types';
import {
  CancelOrderRequestMessage,
  PlaceOrderMessage,
  StreamMessage,
  TradeExecutedMessage,
  TickerMessage,
  TradeFinalizedMessage,
  MyOrderPlacedMessage } from 'gdax-tt/build/src/core/Messages';
import {
  set_Double_Sided_Order,
   set_Limit_Buy,
   set_Limit_Buy_to_Double,
   set_Limit_Sell,
   LBtoDS_helper,
   DS_helper } from './trader';
import { getAndPrintOrderbook } from './helpers';
import { logger, gdaxConfig } from './configs';
require('dotenv').config();

/******************************************************************************************
* FEEDS
*******************************************************************************************/
export function loadTick(isMenu, params) {
  let currentTicker = ZERO;
  let currentAsk = 0;
  let currentBid = 0;
  let current = {ask: 0, bid: 0, spread: 0, ticker: 0};
  let message = {type: '', reason: '', side: '', id: ''};

  getSubscribedFeeds(gdaxConfig, [PRODUCT_ID]).then((feed: GDAXFeed) => {
    const config: LiveBookConfig = {
      product: PRODUCT_ID,
      logger: logger
    };
    const book = new LiveOrderbook(config);
    // register to liveorderbook events
    book.on('data',(msg: StreamMessage) => {
      if (msg.type !== 'level') {
        console.log(msg.type);
      }
      if (msg.type === 'placeOrder') {
        console.log('placeOrder', (msg as PlaceOrderMessage).side);
        console.log((msg as PlaceOrderMessage).price, (msg as PlaceOrderMessage).size);
      }
      if (msg.type === 'cancelOrder') {
        console.log('CANCELLED', chalk.bgRedBright.bold(moment((msg as CancelOrderRequestMessage).time).format('MMMM DD h:mm a')));
        console.log((msg as CancelOrderRequestMessage).orderId.length);
      }
      // https://github.com/coinbase/gdax-tt/issues/110
      // listening to 'data' event, all data remain in memory
      // force stream in flowing state
    });
    book.on('LiveOrderbook.finalized', (msg: TradeFinalizedMessage) => {
      message = {type: msg.type, reason: msg.reason, side: msg.side, id: msg.orderId};
      console.log(`${chalk.bgRedBright((msg as TradeFinalizedMessage).reason)} order ${chalk.red((msg as TradeFinalizedMessage).side)}`);
      console.log(msg);
      console.log(chalk.red(moment((msg as TradeFinalizedMessage).time).format('MMMM DD h:mm a')));
      console.log(`${chalk.bgRedBright((msg as TradeFinalizedMessage).orderId)}`);
      // bot.on('open', () => {
      //   bot.postMessageToChannel(channel, message);
      // });
      // bot.ws.close();
    });
    book.on('LiveOrderbook.placed', (msg: MyOrderPlacedMessage) => {
      message = {type: msg.type, reason: '', side: msg.side, id: msg.orderId};
      console.log(`${chalk.bgGreen('PLACED')} order ${chalk.green((msg as MyOrderPlacedMessage).side)}`);
      console.log(chalk.green((msg as MyOrderPlacedMessage).price, (msg as MyOrderPlacedMessage).size));
      // bot.postMessageToChannel(channel, message);

      // getAndPrintOrderbook().then((v) => {
      // return [v.highestBid.price.toFixed(2),
      //   v.lowestAsk.price.toFixed(2)];
      // }).then((v) => {
      //   const [firstBid, firstAsk] = v;
      //   current.ask = Number(firstAsk);
      //   current.bid = Number(firstBid);
      //   return current;
      // }).then((curr) => {
      //   // LBtoDS_helper(before.message, curr, params);

      //   // switch (isMenu) {
      //   //   case '0' : break;
      //   //   case '1' : set_Limit_Buy_to_Double(before.message, curr,params); break;
      //   //   case '2' : set_Double_Sided_Order(curr,params); break;
      //   //   case '3' : set_Limit_Buy(curr,params); break;
      //   //   case '4' : set_Limit_Sell(curr,params); break;
      //   //   default: console.log('Sorry unable to find menu item. Try again!');
      //   // }
      // });

    });
    book.on('LiveOrderbook.executed', (msg: TradeExecutedMessage) => {
      message = {type: msg.type, reason: '', side: msg.side, id: msg.orderId};
      console.log('TRADE EXECUTED', moment((msg as TradeExecutedMessage).time));
      console.log((msg as TradeExecutedMessage).orderType, (msg as TradeExecutedMessage).side);
      console.log(`${(msg as TradeExecutedMessage).tradeSize} $${(msg as TradeExecutedMessage).price}`);
      // bot.postMessageToChannel(channel, message);
    });
    book.on('LiveOrderbook.ticker', (ticker: Ticker) => {
      currentTicker = ticker.price;
      if (Number(currentTicker) !== spread.ticker) {
        spread.ticker = Number(currentTicker);
        console.log(`${chalk.green('💰 ')} ${currentTicker.toFixed(2)} ${chalk.green(' 💰')} `);
      }

      switch (isMenu) {
        case '0' : break;
        case '1' : set_Limit_Buy_to_Double(before.message, current,params); break;
        case '2' : set_Double_Sided_Order(current,params); break;
        case '3' : set_Limit_Buy(current,params); break;
        case '4' : set_Limit_Sell(current,params); break;
        default: console.log('Sorry unable to find menu item. Try again!');
      }
    });
    book.on('LiveOrderbook.update', (msg: LevelMessage) => {
      if ( before.message !== message ) {
        before.message = message;
      }
      if (before.id === '') {
        before.id = message.id;
      }

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

      console.log('LiveOrderbook',current,before.message, params);
      switch (isMenu) {
        case '0': break;
        case '1': LBtoDS_helper(before.message, before.id , current, params); break;
        case '2': DS_helper(before.message, before.id , current, params); break;
        default: console.log('Sorry unable to find menu item. Try again!');
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
