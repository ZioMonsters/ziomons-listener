const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB({
  region: 'eu-west-3',
  credentials: new AWS.Credentials(require('./test-credentials.json'))
});

const putParams = {
  RequestItems: {
    'cryptomon-monsters-staging': [
      {
        PutRequest: {
          Item: {
            address: {
              S: 'aaaaaaaaaaaaa'
            },
            tokenId: {
              N: '21'
            }
          }
        }
      },
      {
        PutRequest: {
          Item: {
            address: {
              S: 'bbbbbbbbbbbbb'
            },
            tokenId: {
              N: '1'
            }
          }
        }
      },
      {
        PutRequest: {
          Item: {
            address: {
              S: 'Ddddddddddddddd'
            },
            tokenId: {
              N: '3'
            }
          }
        }
      }
    ]
  }
};

dynamoDB.batchWriteItem(putParams).promise()
  .then(console.log)
  .catch(console.error);
