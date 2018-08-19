module.exports = (CryptoMon, fromBlock, toBlock, dynamoDB) => {
  CryptoMon.getPastEvents('Results', {
    fromBlock,
    toBlock
  })
    .then(events => {
      events.reduce((acc, { id, returnValues: { _attacker, _defender } }, index) => {
        if (index % 25 === 0 && index !== 0)
          acc.push({
            attacker: _attacker,
            defender: _defender,
            id
          });
        else if (index + 1 % 25 === 1)
          acc.push([]);

        acc[Math.floor(index / 25)].push(event);
        return acc;
      }, [])
        .forEach(eventsBlock => {
          const putParams = {
            RequestItems: {
              'cryptomon-battles-staging': []
            }
          };

          eventsBlock.forEach(({ attacker, defender, id }) => {
            Array.prototype.push.apply(
              putParams.RequestItems['cryptomon-battles-staging'],
              [
                {
                  PutRequest: {
                    Item: {
                      attacker: {
                        S: attacker.substr(2, attacker.length)
                      },
                      tokenId: {
                        S: id
                      }
                    }
                  }
                },
                {
                  PutRequest: {
                    Item: {
                      defender: {
                        S: defender.substr(2, defender.length)
                      },
                      tokenId: {
                        S: id
                      }
                    }
                  }
                }
              ]);
          });

          dynamoDB.batchWriteItem(putParams).promise()
            .then(console.log)
            .catch(console.error);
        });

    })
    .catch(console.error);
};
