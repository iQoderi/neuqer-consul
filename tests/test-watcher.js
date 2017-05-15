const kzConsul = require('./../index');

const keyPrefix = 'consul_test/dev/';
const config = {
    host: '10.16.3.240',
    port: 8500,
    secure: false,
    keyPrefix,
};
const consulClient = new kzConsul.KZConsul(config);

consulClient
    .openWatch()
    .addWatcher('test1', (err, data) => { console.log(data, 1); })
    .addWatcher('test1', (err, data) => { console.log(data, 2); })
    .addWatcher('test2', (err, data) => { console.log(data, 1); })
    .addWatcher('test2', (err, data) => { console.log(data, 2); })
    .addWatcher('test2', (err, data) => { console.log(data, 3); })
    .addWatcher('test2', (err, data) => { console.log(data, 4); })
    .addWatcher('1/', (err, data) => { console.log(data, 5); });
