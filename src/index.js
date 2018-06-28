const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({
  region: 'eu-west-1',
  credentials: new AWS.Credentials(require('../test-credentials.json'))
});
const dynamoDB = new AWS.DynamoDB({
  region: 'eu-west-3',
  credentials: new AWS.Credentials(require('../test-credentials.json'))
});

const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:9545/');
const abi = require('./CryptoMon.json').abi;
const CryptoMon = new web3.eth.Contract(abi, '0x345ca3e014aaf5dca488057592ee47305d9b3e10');

let fromBlock = 0;

exports.handler = (event, context, callback) => {
  let toBlock;
  web3.eth.getBlockNumber()
    .then(currentBlock => {
      toBlock = currentBlock;
      return CryptoMon.getPastEvents('Transfer', {
        fromBlock,
        toBlock
      });
    })
    .then(events => {
      events
        .reduce((acc, { returnValues: { _from, _to, _tokenId } }) => {
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
          if (index % 25 === 0 && index !== 0)
            acc.push(event);
          else if (index + 1 % 25 === 1)
            acc.push([]);
          acc[Math.floor(index / 25)].push(event);
          return acc;
        }, [])
        .forEach(event => {
          const putParams = {
            RequestItems: {
              'cryptomon-monsters-staging': []
            }
          };
          event.forEach(({ tokenId, from }) => {
            if (from.substr(0, 3) === '0x0') {
              putParams.RequestItems['cryptomon-monsters-staging'].push({
                PutRequest: {
                  Item: {
                    address: {
                      S: from.substr(2, from.length)
                    },
                    tokenId: {
                      N: tokenId.toString()
                    }
                  }
                }
              });
              lambda.invoke({
                FunctionName: 'cryptomon-images-lambda',
                Payload: tokenId
              }).promise()
                .then(console.log)
                .catch(console.error);
            } else {
              dynamoDB.getItem({
                ConsistencyRead: true,
                TableName: 'cryptomon-monsters-staging',
                IndexName: 'monsterIdAddress',
                Key: {
                  tokenId
                }
              }).promise()
                .then(({ Item: { owner } }) =>
                  dynamoDB.deleteItem({
                    TableName: 'cryptomon-monsters-stanging',
                    Key: {
                      address: owner,
                      tokenId
                    }
                  }))
                .then(_ => putParams.RequestItems['cryptomon-monsters-staging'].push({
                  PutRequest: {
                    Item: {
                      address: {
                        S: from.substr(2, from.length)
                      },
                      tokenId: {
                        S: tokenId.toString()
                      }
                    }
                  }
                }));
            }
          });
          if (putParams.RequestItems['cryptomon-monsters-staging'].length !== 0)
            dynamoDB.batchWriteItem(putParams).promise()
              .then(console.log)
              .catch(console.error);
        });
      fromBlock = toBlock;
    });
};
