const { dynamoDB } = require('./aws.js');

const { promiseWaterfall } = require('./utils.js');
const monstersTable = `cryptomon-battles-${process.env.NODE_ENV}`;

module.exports = events => {
  // qui faccio gruppi da 25
  const groups = events.reduce((acc, { id, returnValues: { _attacker: attacker, _defender: defender } }, i) => {
    if (i % 25 === 0 && i !== 0) {
      const index = Math.floor(i / 25);
      acc[index] = [{ attacker, defender, id }];
    } else {
      const index = Math.trunc(i / 25);
      acc[index].push({ attacker, defender, id });
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

    group.forEach(({ attacker, defender, id }) => {
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
