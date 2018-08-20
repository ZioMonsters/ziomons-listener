// parte un evento transfer quando o sbusto un nuovo mostro oppure c'é uno scambio tra due utenti
// lo capisco perché se il from è 0x0 si tratta di un nuovo mostro

const { promiseWaterfall } = require("./utils.js")
const monstersTable = `cryptomon-monsters-${process.env.NODE_ENV}`;

module.exports = (CryptoMon, fromBlock, toBlock, dynamoDB, lambda) => {
  // prendo gli eventi che avvengono tra fromBlock e toBlock
  CryptoMon.getPastEvents('Transfer', {
    fromBlock,
    toBlock
  })
    .then(events => {
      // qui collasso gli eventi per evitare scritture inutili
      const fromByTokenId = events.reduce((acc, { returnValues: { _from, _tokenId } }) => Object.assign(acc, { [_tokenId]: _from }), {});

      // qui faccio gruppi da 25
      const groups = Object.entries(fromByTokenId).reduce((acc, [ tokenId, from ], i) => {
        if (i % 25 === 0 && i !== 0) {
          const index = Math.floor(i / 25);
          acc[index] = [{ tokenId, from }];
        } else {
          const index = Math.trunc(i / 25);
          acc[index].push({ tokenId, from });
        }
        return acc;
      }, [[]]);

      console.log("groups", groups);

      // qui preparo le promises per la waterfall
      const promises = groups.reduce((acc, group) => {
        const putParams = {
          RequestItems: {
            [monstersTable]: []
          }
        };

        group.forEach(({ tokenId, from }) => {
          if (from.substr(0, 3) === '0x0') {
            putParams.RequestItems[monstersTable].push({
              PutRequest: {
                Item: {
                  address: {
                    S: from.substr(2, from.length)
                  },
                  // da verificare la necessità del toString
                  tokenId: {
                    N: tokenId.toString()
                  }
                }
              }
            });

            acc.push(lambda.invoke({
              FunctionName: 'cryptomon-images-lambda',
              Payload: JSON.stringify({ tokenId })
            }).promise())
          } else {
            acc.push(dynamoDB.getItem({
              ConsistencyRead: true,
              TableName: monstersTable,
              IndexName: 'monsterIdAddress',
              Key: {
                tokenId
              }
            }).promise()
              .then(({ Item: { owner } }) =>
                dynamoDB.deleteItem({
                  TableName: monstersTable,
                  Key: {
                    address: owner,
                    tokenId
                  }
                }))
            );
            putParams.RequestItems[monstersTable].push({
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
            });
          }
        });

        if (putParams.RequestItems[monstersTable].length !== 0) {
          acc.push(dynamoDB.batchWriteItem(putParams).promise());
        }
        return acc;
      }, []);
      return promiseWaterfall(promises);
    })
    .then(console.log)
    .catch(console.log);
};
