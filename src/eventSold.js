module.exports = (CryptoMon, fromBlock, toBlock, dynamoDB) => {
  CryptoMon.getPastEvents('ForSale', {
    fromBlock,
    toBlock
  })
    .then(events => {
      events.reduce((acc, { returnValues: { _id, _price } }, index) => {
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
          //todo aggiungere evento Sold
        });
    })
    .catch(console.error);
};
