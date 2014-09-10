const blockchain = require('blockchain-account-monitor');
const Worker = require('sql-mq-worker');
const gatewayd = require(process.env.GATEWAYD_PATH);
const ExternalAddress = gatewayd.data.models.externalAccounts;
const Promise = require('bluebird');

const blockchainClient = new blockchain.Client(
  gatewayd.config.get('DOGECOIND')
);

const coinDaemon = Promise.promisifyAll(blockchainClient.coinDaemon);

const worker = new Worker({
  predicate: {
    where: {
      status: 'outgoing',
      deposit: false,
      currency: 'DOG'
    }
  },
  job: function(payment, next) {
    ExternalAddress.find(payment.external_account_id)
    .then(function(address) {
      return coinDaemon.sendtoaddressAsync(address.uid, payment.amount)
      .then(function(blockchainPayment) {
        console.log('blockchain payment succeeded', blockchainPayment);
        return payment.updateAttributes({
          status: 'cleared'
        })
      })
    })
    .then(function(payment) {
      console.log('cleared payment:', payment);
      next();
    })
    .error(function(error) {
      console.log('blockchain payment error', error);
      next();
    });
  });
});

worker.start();
