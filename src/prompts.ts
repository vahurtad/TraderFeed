/*
 * PROMPTS
 */

export const feedQ = [{
    type: 'rawlist',
    name: 'choice',
    message: 'Which?',
    choices: [
        'Account',
        'Limit Buy - User',
        'Double Sided Order',
        'Limit Buy - Best Bid',
        'Limit Sell - Best Ask',
        'exit'
    ]
}];

export const accountMenu = [{
    type: 'rawlist',
    name: 'more',
    message: 'Account',
    choices: [
        'Balances',
        'Orders',
        'Auth',
        'exit'
    ]
}];

export const limitBuyPrompt = [
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
];
export const doubleSidedPrompt = [
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
 ];
export const limitBuyBidPrompt = [
    {
        type: 'input',
        name: 'size',
        message: 'Size',
        default: 'all'
    },
];
export const limitSellAskPrompt = [
    {
        type: 'input',
        name: 'size',
        message: 'Size',
        default: 'all'
    },
];
