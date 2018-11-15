/*
 * PROMPTS
 */

const validateNum = (v) => {
  console.log(v);
  if (v === '') {
    console.log('all');
    return true;
  } else
  if (v === 'all') {
    return true;
  } else
  if (!isNaN(parseFloat(v))) {
    return true;
  } else {
    console.log('Please type a number or leave blank for all');
  }
};

const validateDecimal = (v) => {
  const valid = v.match(/^(0\d*)?(\.\d+)?(?<=\d)$/i);
  if (valid) {
    return true;
  }
  return 'Please enter a decimal < 1';
};

export const feedQ = [{
    type: 'rawlist',
    name: 'choice',
    message: 'Which?',
    choices: [
        'Account',
        'Limit Buy + DSO',
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
        message: 'Asset Amount',
        default: 'all'
    },
    {
        type: 'input',
        name: 'target',
        message: 'Target Price'
    },
    {
        type: 'input',
        name: 'stop',
        message: 'Stop Loss Price'
    },
    {
       type: 'input',
       name: 'threshold',
       message: 'Threshold to Switch'
    }
];
export const doubleSidedPrompt = [
    {
        type: 'input',
        name: 'size',
        message: 'Asset Amount',
        default: 'all',
        validate: validateNum
     },
     {
        type: 'input',
        name: 'target',
        message: 'Target Price'
     },
     {
        type: 'input',
        name: 'stop',
        message: 'Stop Loss Price'
     },
     {
        type: 'input',
        name: 'threshold',
        message: 'Threshold to Switch',
        validate: validateDecimal
     }
 ];
export const limitBuyBidPrompt = [
    {
        type: 'input',
        name: 'size',
        message: 'Asset Amount',
        default: 'all'
    },
];
export const limitSellAskPrompt = [
    {
        type: 'input',
        name: 'size',
        message: 'Asset Amount',
        default: 'all'
    },
];
