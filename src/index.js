const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'eu-west-1' });
const dynamoDB = new AWS.DynamoDB({ region: 'eu-west-3' });
const { getContractInstance, web3 } = require("./eth.js");

const eventTransfer = require('./eventTransfer');
const eventResults = require('./eventResults');
const eventForSale = require('./eventForSale');
const eventSold = require('./eventSold');

let fromBlock = 0;

exports.handler = (event, context, callback) => {
  let toBlock;
  let CryptoMon;
  getContractInstance()
    .then(contract => {
      CryptoMon = contract;
      return web3.eth.getBlockNumber();
    })
    .then(currentBlock => {
      toBlock = currentBlock;
      [
        eventResults,
        eventForSale,
        eventSold
      ].reduce((acc, func) => acc.then(func(CryptoMon, fromBlock, toBlock, dynamoDB)),
        Promise.resolve(eventTransfer(CryptoMon, fromBlock, toBlock, dynamoDB, lambda)))
        .then(() => fromBlock = toBlock);
    })
    .catch(console.log);
};
