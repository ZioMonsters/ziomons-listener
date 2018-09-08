const Contract = require('truffle-contract');
const { abi } = require('cryptomon-contracts/build/contracts/CryptoMon.json');

const networks = require('../build/state/tokenAddress.json');

const Token = Contract({ abi });

module.exports = callback => {
  Token.setProvider(web3.currentProvider);
  Token.defaults({ 'from': web3.eth.accounts[0], 'gas': 4000000 });

  const { address } = networks[web3.version.network];

  Token.at(address).then(contractInstance =>
    contractInstance.sellMonster.call(1, 200000) //id mostro, prezzo mostro
  )
    .then(txHash => console.log('Successfully unboxed', txHash))
    .then(callback())
    .catch(console.error);
};
