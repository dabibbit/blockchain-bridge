/*

 Run this deamon process alongside gatewayd:

     GATEWAYD_PATH=/path/to/gatewayd pm2 start deposits-manager.js

 The `gatewayd` object accesses the database models via the process
 environment to record crptyo coin addresses and transactions in
 gatewayd for processing and sending onward.

*/
const gatewayd = require(process.env.GATEWAYD_PATH);
const blockchain = require('blockchain-account-monitor');
const ExternalAccount = gatewayd.data.models.externalAccounts;
const ExternalTransaction = gatewayd.data.models.externalTransactions;
const Promise = require('bluebird');

const monitor = new blockchain.AccountMonitor({
  blockchainClient:  new blockchain.Client(
    gatewayd.config.get('DOGECOIND')
  ),
  onBlock: function(block, next) {
    var blockHash = block[0].blockhash;
    var transactions = [];
    block.forEach(function(transaction) {
      transactions.push(
        ExternalAccount.findOrCreate({
          where: {
            uid: transaction.address,
            name: 'dogecoin'
          }
        })
        .then(function(externalAccount) {
          return ExternalTransaction.create({
            uid: transaction.hash,
            amount: transaction.amount,
            currency: 'DOG',
            external_account_id: externalAccount.id
          })
        })
      );
    });
    Promise.all(transactions)
    .then(function() {
      gatewayd.config.set('LAST_BLOCK_HASH', blockhash);
      next();
    })
    .error(function(error) {
      next();
    });
  },
  timeout: 5000
});

monitor.lastBlockHash = gatewayd.config.get('DOGECOIN_LAST_BLOCK_HASH');

monitor.start();

