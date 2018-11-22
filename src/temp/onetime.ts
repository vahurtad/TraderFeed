
import * as GTT from 'gdax-tt';
import { GDAXConfig } from 'gdax-tt/build/src/exchanges/gdax/GDAXInterfaces';
import { GDAXExchangeAPI } from 'gdax-tt/build/src/exchanges';
import { PublicExchangeAPI, Ticker } from 'gdax-tt/build/src/exchanges/PublicExchangeAPI';

const padfloat = GTT.utils.padfloat;
const logger = GTT.utils.ConsoleLoggerFactory({ level: 'info' });

const gdaxConfig: GDAXConfig = {
    logger: logger,
    apiUrl: process.env.GDAX_API_URL || 'https://api.gdax.com',
    auth: {
        key: process.env.GDAX_KEY,
        secret: process.env.GDAX_SECRET,
        passphrase: process.env.GDAX_PASSPHRASE
    }
};

const gdax = new GDAXExchangeAPI(gdaxConfig);

const publicExchanges: PublicExchangeAPI[] = [gdax];

getAndPrintTickers(publicExchanges, 'ETH-USD').then((v) => { console.log(v.ask.toNumber().toFixed(2)); } );

function getTickers(exchanges: PublicExchangeAPI[], product: string): Promise<Ticker[]> {
    const promises = exchanges.map((ex: PublicExchangeAPI) => ex.loadTicker(product));
    return Promise.all(promises);
}

function getAndPrintTickers(exchanges: PublicExchangeAPI[], product: string) {
    return getTickers(publicExchanges, product).then((tickers: Ticker[]) => {
        return tickers[0];
    });
}
process.on('SIGINT', () => {
    process.exit(0);
});
