import chalk from 'chalk';
import { PRODUCT_ID, COIN, THRESHOLD_PRICE } from './constants';
import { padfloat } from 'gdax-tt/build/src/utils';
import { Balances } from 'gdax-tt/build/src/exchanges/AuthenticatedExchangeAPI';
import { PublicExchangeAPI, Ticker } from 'gdax-tt/build/src/exchanges/PublicExchangeAPI';
import { BookBuilder } from 'gdax-tt/build/src/lib/BookBuilder';
import { LiveOrderbook } from 'gdax-tt/build/src/core';
import { publicExchanges, gdaxAPI } from './configs';
/******************************************************************************************
* HELPER FUNCTIONS
*******************************************************************************************/
function getTickers(exchanges: PublicExchangeAPI[]): Promise<Ticker[]> {
  const promises = exchanges.map((ex: PublicExchangeAPI) => ex.loadTicker(PRODUCT_ID));
  return Promise.all(promises);
}

export function getAndPrintTickers() {
  return getTickers(publicExchanges).then((tickers: Ticker[]) => {
      return tickers[0];
  });
}

function getOrderbook(exchanges: PublicExchangeAPI[]): Promise<BookBuilder[]> {
  const promises = exchanges.map((ex: PublicExchangeAPI) => ex.loadOrderbook(PRODUCT_ID));
  return Promise.all(promises);
}

export function getAndPrintOrderbook() {
  return getOrderbook(publicExchanges).then((orderbook: BookBuilder[]) => {
      return orderbook[0];
  });
}

export function hasAuth(): boolean {
if (gdaxAPI.checkAuth()) {
  console.log('Authenticated.');
  return true;
}
console.log('No authentication credentials were supplied, so cannot fulfil request');
return false;
}

function printTicker(ticker: Ticker, quotePrec: number = 2): string {
  return `${padfloat(ticker.price, 10, quotePrec)}`;
}

function printStats(book: LiveOrderbook) {
  let bestBid = book.state().bids[0].price;
  const oldBid = bestBid;
  bestBid = book.state().bids[0].price;
  console.log(`${bestBid}  ${oldBid}`);
}

export function getFlooredFixed(v, d) {
  return (Math.floor(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
}

export function get_Threshold_Price(params) {
  if ( params.threshold === '' ) {
    params.threshold = THRESHOLD_PRICE;
  }
  const difference = params.target - params.stop;
  const thresholdPrice = Number(difference * params.threshold) + Number(params.stop);
  params.thresholdPrice = thresholdPrice;

  console.log(chalk.bgWhite.red('Threshold Price'), chalk.red(params.thresholdPrice));
  return params;
}

export function get_Asset_Size(params, type = 'sell') {
  params.size = params.size.replace(/\s/g,'');
  if (params.size === 'all' || params.size === '' || params.size.length === 0) {
    return getBalances().then((total: any[]) => {
      for ( const i in total ) {
        if (type === 'sell' && total[i].coin === COIN) {
          params.size = total[i].funds.available.toNumber();
          return params;
        }
        if (type === 'buy' && total[i].coin === 'USD') {
          params.size = total[i].funds.available.toNumber();
          return params;
        }
      }
    });
  } else {
    return params;
  }
}

export function getBalances() {
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

export function printBalances() {
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
