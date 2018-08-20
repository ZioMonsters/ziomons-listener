// parte un evento transfer quando o sbusto un nuovo mostro oppure c'é uno scambio tra due utenti
// lo capisco perché se il from è 0x0 si tratta di un nuovo mostro

const montersTable = `cryptomon-monsters-${process.env.NODE_ENV}`;

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
      }, []);

      // qui preparo le promises per la waterfall
      const promises = groups.reduce((acc, group) => {
        const putParams = {
          RequestItems: {
            [montersTable]: []
          }
        };

        group.forEach(({ tokenId, from }) => {
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
