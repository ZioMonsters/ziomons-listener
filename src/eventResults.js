//todo salvare tutto results

const { dynamoDB } = require('./aws.js');
const { promiseWaterfall, createBlocks } = require('./utils.js');

const monstersTable = `cryptomon-battles-${process.env.NODE_ENV}`;

module.exports = events => {
  //estrapolo dagli eventi solo i dati necessari
  const data = events.reduce((acc, { id, returnValues: { _attacker: attacker, _defender: defender } }) =>
    [...acc, [attacker, defender, id]], []);

  //qui creo i blocchi da 25
  const blocks = createBlocks(data);

  // qui preparo le promises per la waterfall
  const promises = blocks.reduce((acc, block) => {
    const putParams = {
      RequestItems: {
        [monstersTable]: []
      }
    };

    block.forEach(([attacker, defender, id]) => {
      //costruisco la putRequest per il batch di dynamoDB
      putParams.RequestItems[monstersTable].push({
        Item: {
          attacker: {
            S: attacker.substr(2, attacker.length)
          },
          defender: {
            S: defender.substr(2, defender.length)
          },
          tokenId: {
            S: id.toString()
          }
        }
      });
    });

    acc.push(dynamoDB.batchWriteItem(putParams).promise());
    return acc;
  }, []);
  return promiseWaterfall(promises);
};
