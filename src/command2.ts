import inquirer = require('inquirer');
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as GTT from 'gdax-tt';
import { BigJS } from 'gdax-tt/src/lib/types';
import { padfloat, printOrderbook } from 'gdax-tt/build/src/utils';
import { LiveBookConfig, LiveOrderbook, LevelMessage } from 'gdax-tt/build/src/core';
import { GDAXConfig } from 'gdax-tt/build/src/exchanges/gdax/GDAXInterfaces';
import { GDAXFeedConfig, GDAXExchangeAPI, GDAX_WS_FEED, GDAX_API_URL, GDAXFeed, ExchangeFeed } from 'gdax-tt/build/src/exchanges';
import { Ticker } from 'gdax-tt/build/src/exchanges/PublicExchangeAPI';
import { DefaultAPI, getSubscribedFeeds,FeedFactory } from 'gdax-tt/build/src/factories/gdaxFactories';
import { ZERO } from 'gdax-tt/build/src/lib/types';

const result = dotenv.config();

const spread = {
    bestBid: '',
    bestAsk: ''
};
const before = {
    ask: '',
    bid: '',
    target: ''
};

/*
 * MAIN PROMPT
 */

const feedQ = [{
    type: 'rawlist',
    name: 'choice',
    message: 'Which?',
    choices: [
        'Limit Buy - User',
        'Double Sided Order',
        'Limit Buy - Best Bid',
        'Limit Sell - Best Ask',
        'Balances',
        'exit'
    ]}];

function setLimitBuy(currentPrice, bestAsk, price, size, target, stop) {
    // buy at target as maker 
    // console.log(Number(current_price) == price)
    // execute double sided order
    if (Number(currentPrice) === parseFloat(price)) {
         // if order executed, then trigger doublesided order
        console.log('trigger double sided order');
        setDoubleSidedOrder(currentPrice,bestAsk, stop, target, size);
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
function getLimitBuy1() {
    inquirer.prompt([
        {
            type: 'input',
            name: 'price',
            message: 'Price to buy'
        },
        {
            type: 'input',
            name: 'size',
            message: 'Size',
            default: 'all'
        },
        {
            type: 'input',
            name: 'target',
            message: 'Target to Sell'
        },
        {
            type: 'input',
            name: 'stop',
            message: 'Stop Loss'
        }
    ]).then( (params) => {
        console.log('Price to Buy:', chalk.green(params.price));
        loadTick('1',params);
    });
}

/*
* while holding, sell range [target or stop]
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
    inquirer.prompt([
       {
            type: 'input',
            name: 'size',
            message: 'Size',
            default: 'all'
        },
        {
            type: 'input',
            name: 'target',
            message: 'Target to Sell'
        },
        {
            type: 'input',
            name: 'stop',
            message: 'Stop Loss'
        }
    ]).then( (params) => {
        loadTick('2',params);
    });
}
function setLimitBuyBid(currentPrice,bestBid, size, target, stop) {
    // buy at best bid
}

function getLimitBuyBid() {
        // buy at best bid as it changes
        inquirer.prompt([
            {
                type: 'input',
                name: 'size',
                message: 'Size',
                default: 'all'
            },
            {
                type: 'input',
                name: 'target',
                message: 'Target to Sell'
            },
            {
                type: 'input',
                name: 'stop',
                message: 'Stop Loss'
            }
        ]).then((params) => {
            loadTick('3',params);
        });
}
function setLimitSellAsk(currentPrice,bestAsk, size, target, stop) {
    // sell at best ask
}

function getLimitBuyAsk() {
    // sell at best ask as it changes
    inquirer.prompt([
        {
            type: 'input',
            name: 'size',
            message: 'Size',
            default: 'all'
        }
    ]).then((params) => {
        loadTick('4',params);
    });
}

/*eee
 * GDAX FUNCTIONS
 */
const logger = GTT.utils.ConsoleLoggerFactory({level: 'error'});
const gdaxConfig: GDAXConfig = {
    logger: logger,
    apiUrl: process.env.GDAX_API_URL || 'https://api.gdax.com',
    auth: {
        key: process.env.GDAX_KEY,
        secret: process.env.GDAX_SECRET,
        passphrase: process.env.GDAX_PASSPHRASE
    }
};
const gdaxAPI = new GDAXExchangeAPI(gdaxConfig);

function hasAuth(): boolean {
    if (gdaxConfig.auth) {
        return true;
    }
    console.log('No authentication credentials were supplied, so cannot fulfil request');
    return false;
}

function getBalances( ) {
    console.log(hasAuth());
}

function loadTick(isMenu, params) {
    let currentTicker = ZERO;
    let currentAsk = 0;
    let currentBid = 0;
    let bid = 0;
    const  product = 'BCH-USD';
    getSubscribedFeeds(gdaxConfig, [product]).then((feed: GDAXFeed) => {
        const config: LiveBookConfig = {
        product: product,
        logger: logger
        };
        const book = new LiveOrderbook(config);
        book.on('data',() => { /*linter*/ });
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
        feed.pipe(book);
    }).catch((err) => {
        console.log('ERROR',err);
    });
}

/*
* PRINT FUNCTIONS
*/
function printTicker(product: string, ticker: Ticker, quotePrec: number = 2): string {
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

// function limitOrderBuy(product: string, price: string, size: string){
//     const order: PlaceOrderMessage ={
//         type: 'placeOrder',
//         time: new Date(),
//         productId: product,
//         side: 'buy',
//         orderType: 'limit',
//         price: price,
//         postOnly: true, //maker: true, maker||taker: false 
//         size: size,
//       };
//       gdax.placeOrder(order).then((liveOrder: LiveOrder)=>
//       {
//           console.log(liveOrder)
//       })
//   }

  // function limitOrderSell(product: string, price: string, size: string){
//   const order: PlaceOrderMessage ={
//     type: 'placeOrder',
//     time: new Date(),
//     productId: product,
//     side: 'sell',
//     orderType: 'limit',
//     price: price,
//     postOnly: true, //maker: true, maker|taker: false 
//     size: size,
//   }
// }

// function marketOrderBuy(product: string, price: string, size: string){
//   const order: PlaceOrderMessage ={
//     type: 'placeOrder',
//     time: new Date(),
//     productId: product,
//     side: 'buy',
//     orderType: 'market',
//     price: price,
//     size: size,
//   }
// }
// function marketOrderSell(product: string, price: string, size: string){
//   const order: PlaceOrderMessage ={
//     type: 'placeOrder',
//     time: new Date(),//null?
//     productId: product,
//     side: 'sell',
//     orderType: 'market',
//     price: price,
//     size: size,
//   }
// }

/*
 * MAIN PROMPT CALL
 */
inquirer.prompt(feedQ).then( (ans) => {
    if (ans.choice === 'Limit Buy- User') {
        getLimitBuy1();
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
    if (ans.choice === 'Balances') {
        getBalances();
    } else
    if (ans.choice === 'exit') {
        console.log(chalk.cyan('Good Bye 👋\n')); process.exit();
    } else {
        console.log('Sorry, wrong answer');
    }
});
