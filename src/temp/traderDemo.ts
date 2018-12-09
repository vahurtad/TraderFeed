/***************************************************************************************************************************
 * @license                                                                                                                *
 * Copyright 2017 Coinbase, Inc.                                                                                           *
 *                                                                                                                         *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance          *
 * with the License. You may obtain a copy of the License at                                                               *
 *                                                                                                                         *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                              *
 *                                                                                                                         *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on     *
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the                      *
 * License for the specific language governing permissions and limitations under the License.                              *
 ***************************************************************************************************************************/

import { getSubscribedFeeds, FeedFactory } from 'gdax-tt/build/src/factories/gdaxFactories';
import { ConsoleLoggerFactory } from 'gdax-tt/build/src/utils/Logger';
import { GDAX_API_URL, GDAXFeed, GDAXFeedConfig } from 'gdax-tt/build/src/exchanges';
import { Trader, TraderConfig } from 'gdax-tt/build/src/core/Trader';
import Limiter from 'gdax-tt/build/src/core/RateLimiter';
import { ZERO } from 'gdax-tt/build/src/lib/types';
import chalk from 'chalk';
import { PublicExchangeAPI, Ticker } from 'gdax-tt/build/src/exchanges/PublicExchangeAPI';
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
    MyOrderPlacedMessage
} from 'gdax-tt/build/src/core/Messages';
import { StaticCommandSet } from 'gdax-tt/build/src/lib/StaticCommandSet';
import { LiveOrder } from 'gdax-tt/build/src/lib/Orderbook';
import { GDAXConfig } from 'gdax-tt/build/src/exchanges/gdax/GDAXInterfaces';
import { LiveBookConfig, LiveOrderbook, LevelMessage, SkippedMessageEvent } from 'gdax-tt/build/src/core';
require('dotenv').config();

const logger = ConsoleLoggerFactory({level: 'info'});
const product = 'BTC-USD';
const gdaxConfig: GDAXFeedConfig = {
  logger: logger,
  apiUrl: process.env.COINBASE_SANDBOX_API,
  auth: {
    key: process.env.GDAX_PRO_KEY,
    secret: process.env.GDAX_PRO_SECRET,
    passphrase: process.env.GDAX_PRO_PASSPHRASE
  },
  wsUrl: process.env.COINBASE_PRO_SANDBOX_WS,

};

// We could also use FeedFactory here and avoid all the config above.

FeedFactory(gdaxConfig, [product], gdaxConfig.auth).then((feed: GDAXFeed) => {
  feed.on('data', (msg) => {

      console.log((msg as any).type);
      if ((msg).type === 'trade') {
        console.log((msg as TradeMessage).side, (msg as TradeMessage).price);
      }

      if ((msg).type === 'ticker') {
        console.log('TICKER', (msg as TickerMessage).price.toFixed(2));
        console.log('BID', (msg as TickerMessage).bid.toFixed(2));
        console.log('ASK', (msg as TickerMessage).ask.toFixed(2));
      }

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

  });
}).catch((err: Error) => {
  logger.log('error', err.message);
  process.exit(1);
});
