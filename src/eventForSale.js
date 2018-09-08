const { getContractInstance } = require('./eth.js');
const { dynamoDB } = require('./aws.js');
const { promiseWaterfall, createBlocks } = require('./utils.js');

const monstersTable = `cryptomon-shop-${process.env.NODE_ENV}`;

module.exports = events => {
  //estrapolo dagli eventi solo i dati necessari
  const data = events.reduce((acc, { returnValues: { _id: tokenId, _price: price } }) =>
    [...acc, [tokenId, price]], []);

  //qui creo i blocchi da 25
  const blocks = createBlocks(data);

  // qui preparo le promises per la waterfall
  return getContractInstance()
    .then(Cryptomon => {
      return blocks.reduce((acc, block) => {
        const putParams = {
          RequestItems: {
            [monstersTable]: block.reduce((acc, [tokenId, price]) => {
              const { rarity } = Cryptomon.Monsters(tokenId);
              return [
                ...acc,
                {
                  PutRequest: {
                    Item: {
                      tokenId: {
                        N: tokenId.toString()
                      },
                      price: {
                        N: price.toString()
                      },
                      rarity: {
                        S: rarity.toString()
                      }
                    }
                  }
                }
              ];
            }, [])
          }
        };
        return [
          ...acc,
          dynamoDB.batchWriteItem(putParams).promise()
        ];
      }, []);
    })
    .then(promiseWaterfall);
};
