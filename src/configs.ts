import * as GTT from 'gdax-tt';
import { GDAXExchangeAPI, GDAXFeedConfig } from 'gdax-tt/build/src/exchanges';
import { GDAXConfig } from 'gdax-tt/build/src/exchanges/gdax/GDAXInterfaces';
import { PublicExchangeAPI } from 'gdax-tt/build/src/exchanges/PublicExchangeAPI';
require('dotenv').config();
/******************************************************************************************
* GDAX FUNCTIONS
*******************************************************************************************/
export const logger = GTT.utils.ConsoleLoggerFactory({level: 'error'});

export const gdaxConfig: GDAXConfig = {
  logger: logger,
  apiUrl: process.env.COINBASE_API,
  auth: {
    key: process.env.GDAX_KEY,
    secret: process.env.GDAX_SECRET,
    passphrase: process.env.GDAX_PASSPHRASE
  }
};

// // Sandbox
// export const gdaxConfig: GDAXFeedConfig = {
//   logger: logger,
//   apiUrl: process.env.COINBASE_PRO_SANDBOX_API,
//   wsUrl: process.env.COINBASE_PRO_SANDBOX_WS,
//   auth: {
//     key: process.env.GDAX_PRO_KEY,
//     secret: process.env.GDAX_PRO_SECRET,
//     passphrase: process.env.GDAX_PRO_PASSPHRASE
//   }
// };

export const gdaxAPI = new GDAXExchangeAPI(gdaxConfig);

export const publicExchanges: PublicExchangeAPI[] = [gdaxAPI];
