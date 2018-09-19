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

function setLimitBuy(currentPrice, bestAsk, price, size, target, stop) {
    // buy at target as maker 
    limitOrderBuy(price,size);
    // execute double sided order
    if (Number(currentPrice) === parseFloat(price)) {
         // if order executed, then trigger doublesided order
        console.log('trigger double sided order');
        setDoubleSidedOrder(currentPrice, bestAsk, stop, target, size);
    } else
    if (Number(currentPrice) === stop) {
        // cancel order
        // exit
        process.exit();
    }
}

/* 
* when not holding, buy and execute double sided order
* if price > target then set @ new best ask price
* if stop @ post did not execute stop @ market?
*/
function getLimitBuy() {
    inquirer.prompt(prompt.limitBuyPrompt).then( (params) => {
        console.log('Price to Buy:', chalk.green(params.price));
        loadTick('1',params);
    });
}

/*
* while holding, sell within range [target or stop]
* if current price > target then set at best ask
* if price <= stop, sell @ market(taker)
*/
function setDoubleSidedOrder(currentPrice, bestAsk, stop, target, size) {
    const mytarget = target;
    /*
    * only change order when current target has changed
    * console.log(best_ask,target,mytarget)
    */
    target = Math.max(bestAsk, target, mytarget);
    // check if target has changed
    if (target.valueOf() !== before.target.valueOf()) {
        console.log('target changed', chalk.cyan(target));
        before.target = target;
        if (Number(currentPrice) === target) {
            console.log('target reached');
            // exit if order is done
        } else
        if (Number(currentPrice) <= parseFloat(stop)) {
            // cancel order  
            // sell as taker
            console.log('sell as taker', stop);
            // complete sell
            process.exit();
            // set order  
        }
    } else
    // not necessary
    if (target.valueOf() === before.target.valueOf()) {
        // do nothing
        // console.log('same', target)
    }
}
function getDoubleSided() {
    // executes when holding
    inquirer.prompt(prompt.doubleSidedPrompt).then( (params) => {
        loadTick('2',params);
    });
}
function setLimitBuyBid(currentPrice,bestBid, size, target, stop) {
    // buy at best bid
}

function getLimitBuyBid() {
    // buy at best bid as it changes
    inquirer.prompt(prompt.limitBuyBidPrompt).then((params) => {
        loadTick('3',params);
    });
}
function setLimitSellAsk(currentPrice,bestAsk, size, target, stop) {
    // sell at best ask
}

function getLimitBuyAsk() {
    // sell at best ask as it changes
    inquirer.prompt(prompt.limitBuyAskPrompt).then((params) => {
        loadTick('4',params);
    });
}

/*
 * GDAX FUNCTIONS
 */
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
        console.log(true);
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

function getOrders() {
    console.log(PRODUCT_ID);
    gdaxAPI.loadAllOrders(PRODUCT_ID).then((orders) => {
        if (orders.length === 0) {
            console.log('No orders');
        }
        orders.forEach((order: LiveOrder) => {
            console.log(`${order.status}\t${order.productId}\t${order.side}\t${order.price.toNumber()}\t`);
            if (order.status === 'open') {
                console.log(`${chalk.greenBright('OPEN ORDERS')}`);
                console.log(`${order.productId}\t${order.side}\t${order.price.toNumber()}\t`);
            }
        });
    }).catch((err) => {
        console.log('error', err);
    });
}

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
                if (isMenu === '1') {
                    setLimitBuy(currentTicker,currentAsk,params.price,params.size,params.target,params.stop);
                } else
                if (isMenu === '2') {
                    setDoubleSidedOrder(currentTicker,currentAsk,params.stop,params.target, params.size);
                } else
                if (isMenu === '3') {
                    setDoubleSidedOrder(currentTicker,currentAsk,params.stop,params.target, params.size);
                } else
                if (isMenu === '4') {
                    setDoubleSidedOrder(currentTicker,currentAsk,params.stop,params.target, params.size);
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

function placeOrder(order: PlaceOrderMessage) {
    const msg = `Limit ${order.side} order for ${order.size} at ${order.price}`;
    gdaxAPI.placeOrder(order).then((liveOrder: LiveOrder) => {
        console.log(liveOrder);
        console.log(msg);
    }).catch((err) => {
        console.log('ERROR',err);
    });
}

function limitOrderBuy(price: string, size: string) {
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
function marketOrderBuy(price: string, size: string) {
    const order: PlaceOrderMessage = {
        type: 'placeOrder',
        time: new Date(),
        productId: PRODUCT_ID,
        side: 'buy',
        orderType: 'market',
        price: price,
        size: size,
    };
    placeOrder(order);
}
function marketOrderSell(price: string, size: string) {
    const order: PlaceOrderMessage = {
        type: 'placeOrder',
        time: new Date(),
        productId: PRODUCT_ID,
        side: 'sell',
        orderType: 'market',
        price: price,
        size: size,
    };
    placeOrder(order);
}
/*
* PRINT FUNCTIONS
*/
function printTicker(ticker: Ticker, quotePrec: number = 2): string {
    return `${padfloat(ticker.price, 10, quotePrec)}`;
  }

function printStats(book: LiveOrderbook) {
    // `${chalk.red('|')}${padfloat(book.state().asks[0].totalSize,5,4)} ${book.state().asks[0].price}`
    //      +`\t${chalk.green('|')}${padfloat(book.state().bids[0].totalSize,5,4)} ${book.state().bids[0].price}`;
    let bestBid = book.state().bids[0].price;
    const oldBid = bestBid;
    bestBid = book.state().bids[0].price;
    console.log(`${bestBid}  ${oldBid}`);
  }

/*
 * MAIN PROMPT CALL
 */
inquirer.prompt(prompt.feedQ).then( (ans) => {
    if (ans.choice === 'Account') {
        gotoAccountMenu();
    } else
    if (ans.choice === 'Limit Buy- User') {
        getLimitBuy();
    } else
    if (ans.choice === 'Double Sided Order') {
        getDoubleSided();
    } else
    if (ans.choice === 'Limit Buy - Best Bid') {
        getLimitBuyBid();
    } else
    if (ans.choice === 'Limit Sell - Best Ask') {
        getLimitBuyAsk();
    } else
    if (ans.choice === 'exit') {
        console.log(chalk.cyan('Good Bye 👋\n')); process.exit();
    } else {
        console.log('Sorry, wrong answer');
    }
});

function gotoAccountMenu() {
    inquirer.prompt(prompt.accountMenu).then( (ans) => {
        if (ans.more === 'Balances') {
            getBalances();
        } else
        if (ans.more === 'Orders') {
            getOrders();
        }
        if (ans.more === 'Auth') {
            hasAuth();
        }
    });
}
