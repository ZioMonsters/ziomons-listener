module.exports = (CryptoMon, fromBlock, toBlock, dynamoDB, lambda) => {
  CryptoMon.getPastEvents('Transfer', {
    fromBlock,
    toBlock
  })
    .then(events => {
      events
        .reduce((acc, { returnValues: { _from, _tokenId } }) => {
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
                Payload: JSON.stringify({ tokenId })
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
                .then(() =>
                  putParams.RequestItems['cryptomon-monsters-staging'].push({
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
    })
    .catch(console.log);
};
