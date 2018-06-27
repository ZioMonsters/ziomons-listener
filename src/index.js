const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'eu-west-3' });
const dynamoDB = new AWS.DynamoDB({ region: 'eu-west-3' });

const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:9545/');
const abi = require('../cryptomon-contracts/build/contracts/CryptoMon.json').abi;
const CryptoMon = new web3.eth.Contract(abi, '0xecfcab0a285d3380e488a39b4bb21e777f8a4eac');

let fromBlock = 0;

exports.handler = (event, context, callback) => {
  web3.eth.getBlockNumber()
    .then(lastBlock => {
      CryptoMon.getPastEvents('Transfer', {
        fromBlock,
        toBlock: lastBlock
      }, (err, events) => {

        events
          .reduce((acc, {returnValues: {_from, _to, _tokenId}}) => {
            if (acc.includes(_tokenId))
              return acc;
            else
              acc.push({
                tokenId: _tokenId,
                from: _from
              });
            return acc;
          }, [])
          .reduce((acc, event, index) => {
            if (index % 25 === 0)
              acc.push(event);
            else
              acc.push([]);
            return acc[Math.floor(index / 25)][index % 25] = event;
          }, [])
          .forEach(({ tokenId, from }) => {
            if (from.substr(0, 3) === '0x0')
              dynamoDB.putItem({
                TableName: 'cryptomon-monster-staging',
                Item: {
                  address: {
                    S: from
                  },
                  tokenId: {
                    S: tokenId
                  }
                }
              }).promise()
                .then(_ => lambda.invoke({
                  FunctionName: 'cryptomon-images-lambda',
                  InvocationType: 'RequestResponse',
                  LogType: 'None'
                }).promise())
                .then(console.log)
                .catch(console.error);
            else {
              const currentOwner = CryptoMon.methods.ownerOf(tokenId);
              dynamoDB.getItem({
                ConsistencyRead: true,
                TableName: 'cryptomon-monster-staging',
                IndexName: 'nome fake',
                Key: {
                  tokenId: tokenId
                }
              }).promise()
                .then(({Item: {owner}}) =>
                  dynamoDB.deleteItem({
                    TableName: 'cryptomon-monster-stanging',
                    Key: {
                      address: owner,
                      tokenId: tokenId
                    }
                  }).promise())
                .then(_ => dynamoDB.putItem({
                  TableName: 'cryptomon-monster-staging',
                  Item: {
                    address: {
                      S: currentOwner
                    },
                    tokenId: {
                      S: tokenId
                    }
                  }
                }).promise())
                .then(console.log)
                .catch(console.error)
            }
          });
      });
    });
  fromBlock = lastBlock;
};
