const Contract = require('truffle-contract');
const { abi, bytecode } = require('cryptomon-contracts/build/contracts/CryptoMon.json');
const fse = require('fs-extra');

const Token = Contract({ bytecode, abi });

module.exports = function(deployer, network, accounts) {
  Token.setProvider(web3.currentProvider);
  Token.defaults({ 'from': accounts[0], 'gas': 8000000 });
  deployer.deploy(Token, { overwrite: false })
    .then(() => Token.deployed())
    .then(() => {
      fse.ensureDirSync('build/state');
      fse.writeJsonSync(
        'build/state/tokenAddress.json',
        {
          [web3.version.network]: {
            'events': {},
            'links': {},
            'address': Token.address,
            'transactionHash': ''
          }
        });
    })
    .catch(console.error);
};
