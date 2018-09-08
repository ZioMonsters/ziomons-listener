// parte un evento transfer quando o sbusto un nuovo mostro oppure c'é uno scambio tra due utenti
// lo capisco perché se il from è 0x0 si tratta di un nuovo mostro

const { lambda, dynamoDB } = require('./aws.js');
const { promiseWaterfall, createBlocks } = require('./utils.js');

const monstersTable = `cryptomon-monsters-${process.env.NODE_ENV}`;

module.exports = events => {
  // qui collasso gli eventi per evitare scritture inutili
  const fromByTokenId = events.reduce((acc, { returnValues: { _from, _to, _tokenId } }) => Object.assign(acc, { [_tokenId]: [_from, _to] }), {});

  //qui creo i blocchi da 25
  const blocks = createBlocks(Object.entries(fromByTokenId));

  // qui preparo le promises per la waterfall
  const promises = blocks.reduce((acc, block) => {
    const putParams = {
      RequestItems: {
        [monstersTable]: []
      }
    };

    block.forEach(([tokenId, [from, to]]) => {
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
