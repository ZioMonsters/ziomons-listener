module.exports = (CryptoMon, fromBlock, toBlock, dynamoDB) => {
  CryptoMon.getPastEvents('ForSale', {
    fromBlock,
    toBlock
  })
    .then(events => {
      events.reduce((acc, {returnValues: {_id, _price}}, index) => {
        if (index % 25 === 0 && index !== 0)
          acc.push({
            tokenId: _id,
            price: _price
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

          eventsBlock.forEach(({tokenId, price}) => {
            putParams.RequestItems['cryptomon-shop-staging'].push({
              PutRequest: {
                Item: {
                  tokenId: {
                    N: tokenId.toString()
                  },
                  price: {
                    N: price.toString()
                  }
                  //todo pensare a come trovarli
                  /*rarity: {
                    S:
                  },
                  genome: {
                    N:
                  }*/
                }
              }
            });
          });

          dynamoDB.batchWriteItem(putParams).promise()
            .then(console.log)
            .catch(console.error);
        });
    })
    .catch(console.error);
};
