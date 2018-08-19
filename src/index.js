const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'eu-west-1' });
const dynamoDB = new AWS.DynamoDB({ region: 'eu-west-3' });

const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:9545/'); //todo inserirci qualcosa di funzionante
const abi = require('./CryptoMon.json').abi;
const CryptoMon = new web3.eth.Contract(abi, '0x345ca3e014aaf5dca488057592ee47305d9b3e10');

const eventTransfer = require('./eventTransfer');
const eventResults = require('./eventResults');
const eventForSale = require('./eventForSale');
const eventSold = require('./eventSold');

let fromBlock = 0;

exports.handler = (event, context, callback) => {
  let toBlock;
  web3.eth.getBlockNumber()
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
