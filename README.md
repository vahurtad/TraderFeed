# TraderFeed
Tackle the problem of setting a limit-stop-loss and a limit-buy-target at the same time.
- connect to the feed and output price and order book triggers
- can automatically hold or sell at the best bid or best ask price, triggered each time price changes using a threshold
- have a stop loss and sell limit to be executed manually, cancelled or changed

Trader helper is built on top of [GDAX TRADING TOOLKIT](https://github.com/coinbase/gdax-tt) now renamed to **Coinbase Pro Trading toolkit**. There are some more changes made to gdax-tt for new triggers that were missing such as order filled, order triggered, and order made. My changes can be seen here [gdax-tt](https://github.com/vahurtad/gdax-tt).

All the features wanted for this project were not available and are still not available today at Coinbase and I wanted to use my time to learn TypeScript and Crypto trading based on a lot of theory.

### Timeline
I did not have a timeline for this project, as something needed to change, or I needed to learn and fix. 
For this project, there was always an iteration of first finding what we wanted, then doing research and learning about theory, then fixing said features we wanted to make it better than 'bots' or people trading. The more we learned about game theory, market cycles, behavior and trends, a new list would be made for new features and the same iterative process would occur. There was also a lot of testing done on _Coinbase Sandbox_ but unfortunately it does not equate to real-time live trading.

### Collaboration
This personal project was built for my personal gain and interest and was helped by a friend on learning the theory as we were both involved in trading at the same time. We both wanted to speed up the process of making trades with the utilities made available by Coinbase.

### Challenges
There were many challenges throughout the iteration process. Many of them were trying to understand the trends, when, how, and why they happened. Since it is theory-based, our trades wouldn't hit 100% of the time but wanted to at least remove some of the human error, improve awareness and speed using this tool. 

A small challenge for me was learning TypeScript while also learning what the code from Coinbase does. TypeScript was very easy to read, understanding why datatypes are needed and already knowing JavaScript made this challenge easier to start.

### More, More, More

#### Clone
    git clone https://github.com/coinbase/gdax-tt.git 

#### Build gdax-tt module
 Run the included test suite with the command

    yarn run build

##### GDAX Trading toolkit
[GDAX TT ](https://github.com/coinbase/gdax-tt)

#### GDAX TT API Reference
[https://coinbase.github.io/gdax-tt/apiref/index.html](https://coinbase.github.io/gdax-tt/apiref/index.html)

#### Run
 Run with the command
    
    ts-node trader
#### Necessary
    > npm i -g --vs2015 windows-build-tools
   [gdax-tt edit](https://github.com/vahurtad/gdax-tt)

#### Menu
![menu image1](../test/images/Menu.JPG)

![menu image2](../test/images/DSO-Menu.JPG)
