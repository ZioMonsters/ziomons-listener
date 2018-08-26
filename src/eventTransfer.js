// parte un evento transfer quando o sbusto un nuovo mostro oppure c'é uno scambio tra due utenti
// lo capisco perché se il from è 0x0 si tratta di un nuovo mostro

const { lambda, dynamoDB } = require('./aws.js');
const { promiseWaterfall } = require('./utils.js');

const monstersTable = `cryptomon-monsters-${process.env.NODE_ENV}`;

module.exports = events => {
  // qui collasso gli eventi per evitare scritture inutili
  const fromByTokenId = events.reduce((acc, { returnValues: { _from, _to, _tokenId } }) => Object.assign(acc, { [_tokenId]: [_from, _to] }), {});

  // qui faccio gruppi da 25
  const groups = Object.entries(fromByTokenId).reduce((acc, [ tokenId, [from, to] ], i) => {
    if (i % 25 === 0 && i !== 0) {
      const index = Math.floor(i / 25);
      acc[index] = [{ tokenId, from, to }];
    } else {
      const index = Math.trunc(i / 25);
      acc[index].push({ tokenId, from, to });
    }
    return acc;
  }, [[]]);

  // qui preparo le promises per la waterfall
  const promises = groups.reduce((acc, group) => {
    const putParams = {
      RequestItems: {
        [monstersTable]: []
      }
    };

    group.forEach(({ tokenId, from, to }) => {
      //stessa struttura sia quando il mostro viene sbustato sia quando viene scambiato tra users
      const sample = {
        putRequest: {
          Item: {
            address: {
              S: to.substr(2, from.length)
            },
            tokenId: {
              S: tokenId.toString()
            }
          }
        }
      };

      //se l'address e' 0x0 vuol dire che il mostro e' appena stato sbustato,
      //quindi si deve invocare la lambda per creare l'immagine
      if (from.substr(0, 3) === '0x0') {
        //costruisco la putRequest per il batch di dynamoDB
        putParams.RequestItems[monstersTable].push(sample);

        acc.push(lambda.invoke({
          FunctionName: 'cryptomon-images-lambda',
          Payload: JSON.stringify({ tokenId })
        }).promise());
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
        putParams.RequestItems[monstersTable].push(sample);
      }
    });

    if (putParams.RequestItems[monstersTable].length !== 0) {
      acc.push(dynamoDB.batchWriteItem(putParams).promise());
    }
    return acc;
  }, []);
  return promiseWaterfall(promises);
};
