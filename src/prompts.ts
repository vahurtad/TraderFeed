import { THRESHOLD_PRICE } from './constants';
/*
* PROMPTS
*/
const validateAsset = (v: string) => {
  v = v.replace(/\s/g,'');
  if (v === '' || v === 'all' || v.length === 0) {
    return true;
  } else
  if (!isNaN(parseFloat(v))) {
    return true;
  }
  return 'Please type a number or leave blank for all';
};

const validateNumber = (v: string) => {
  if (!isNaN(parseFloat(v))) {
    return true;
  }
  return 'Please type a number';
};

const validateDecimal = (v: string) => {
  const valid = v.match(/^(0\d*)?(\.\d+)?(?<=\d)$/i);
  v = v.replace(/\s/g,'');
  if (v === '' || v.length === 0) {
    return true;
  } else
  if (valid) {
    return true;
  }
  return `Please enter a decimal < 1 or leave blank for ${THRESHOLD_PRICE}` ;
};

export const feedQ = [{
  type: 'list',
  name: 'choice',
  message: 'Which?',
  choices: [
    'Account',
    'Limit Buy + DSO',
    'Double Sided Order',
    'Limit Buy - Best Bid',
    'Limit Sell - Best Ask',
    'Watch',
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

export const entryPrompt = [
  {
    type: 'input',
    name: 'entry',
    message: 'Entry Price',
    validate: validateNumber
  },
];

export const limitBuytoDSPrompt = [
  {
    type: 'input',
    name: 'size',
    message: 'Asset Amount',
    default: 'all',
    validate: validateAsset
  },
  {
    type: 'input',
    name: 'target',
    message: 'Target Price',
    validate: validateNumber
  },
  {
    type: 'input',
    name: 'stop',
    message: 'Stop Loss Price',
    validate: validateNumber
  },
  {
    type: 'input',
    name: 'threshold',
    message: 'Threshold to Switch',
    default: THRESHOLD_PRICE,
    validate: validateDecimal
  }
];
export const doubleSidedPrompt = [
  {
    type: 'input',
    name: 'size',
    message: 'Asset Amount',
    default: 'all',
    validate: validateAsset
  },
  {
    type: 'input',
    name: 'target',
    message: 'Target Price',
    validate: validateNumber
  },
  {
    type: 'input',
    name: 'stop',
    message: 'Stop Loss Price',
    validate: validateNumber
  },
  {
    type: 'input',
    name: 'threshold',
    message: 'Threshold to Switch',
    default: THRESHOLD_PRICE,
    validate: validateDecimal
  }
];
export const limitBuyBidPrompt = [
  {
    type: 'input',
    name: 'size',
    message: 'Asset Amount',
    default: 'all',
    validate: validateAsset
  },
];
export const limitSellAskPrompt = [
  {
    type: 'input',
    name: 'size',
    message: 'Asset Amount',
    default: 'all',
    validate: validateAsset
  },
];
