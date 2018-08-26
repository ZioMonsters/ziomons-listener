const { dynamoDB } = require('./aws.js');

const { promiseWaterfall } = require('./utils.js');
const monstersTable = `cryptomon-shop-${process.env.NODE_ENV}`;

module.exports = events => {
  // qui faccio gruppi da 25
  const groups = events.reduce((acc, { returnValues: { _id: tokenId, _price: price } }, i) => {
    if (i % 25 === 0 && i !== 0) {
      const index = Math.floor(i / 25);
      acc[index] = [{ tokenId, price }];
    } else {
      const index = Math.trunc(i / 25);
      acc[index].push({ tokenId, price });
    }
    return acc;
  }, []);

  // qui preparo le promises per la waterfall
  const promises = groups.reduce((acc, group) => {
    const putParams = {
      RequestItems: {
        [monstersTable]: []
      }
    };

    group.forEach(({ tokenId, price }) => {
      //costruisco la putRequest per il batch di dynamoDB
      putParams.RequestItems[monstersTable].push({
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

    acc.push(dynamoDB.batchWriteItem(putParams).promise());
    return acc;
  }, []);
  return promiseWaterfall(promises);
};
