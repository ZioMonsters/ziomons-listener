const { getContractInstance, web3:{ eth: { getBlockNumber } } } = require('./eth.js');

const eventTransfer = require('./eventTransfer');
const eventResults = require('./eventResults');
const eventForSale = require('./eventForSale');
const eventSold = require('./eventSold');

let fromBlock = 0;

exports.handler = (event, context, callback) => {
  let toBlock;
  let listenerEvents;
  //todo rendi asincrono il tutto
  getContractInstance()
    .then(({ getPastEvents }) => {
      listenerEvents = getPastEvents;
      return getBlockNumber();
    })
    .then(currentBlock => {
      toBlock = currentBlock;
      return listenerEvents('Transfer', {
        fromBlock,
        toBlock
      });
    })
    .then(eventTransfer)
    .then(log => {
      console.log(log);
      return listenerEvents('ForSale', {
        fromBlock,
        toBlock
      });
    })
    .then(eventForSale)
    .then(log => {
      console.log(log);
      return listenerEvents('Results', {
        fromBlock,
        toBlock
      });
    })
    .then(eventResults)
    .then(log => {
      console.log(log);
      return listenerEvents('Sold', {
        fromBlock,
        toBlock
      });
    })
    .then(eventSold)
    .then(log => {
      console.log(log);
      fromBlock = toBlock;
    })
    .catch(console.log);
};
