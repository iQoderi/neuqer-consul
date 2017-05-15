/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const kzConsul = require('../index');

const expect = chai.expect;
const config = {
    host: '10.16.3.240',
    port: 8500,
    secure: false,
    keyPrefix: 'consul_test/dev/',
};
const consul = new kzConsul.KZConsul(config);

describe('setValue function test: ', () => {
    it('should single value be ok', (done) => {
        consul.setValue({
            key: 'test1',
            value: 1,
            callback: (err, result) => {
                expect(err).to.be.undefined;
                expect(result).to.true;
                done();
            },
        });
    });

    it('should json value be ok', (done) => {
        consul.setValue({
            key: 'test2',
            value: JSON.stringify([1, 2, 3]),
            dataType: kzConsul.TypeFlags.JSON,
            callback: (err, result) => {
                expect(err).to.be.undefined;
                expect(result).to.true;
                done();
            },
        });
    });
});

describe('getValue function test: ', () => {
    it('should single value be ok', (done) => {
        consul.getValue('test1', (err, result) => {
            expect(err).to.be.null;
            expect(result).to.equal('1');
            done();
        });
    });

    it('should json value be ok', (done) => {
        consul.getValue('test2', (err, result) => {
            expect(err).to.be.null;
            expect(result).to.be.instanceof(Array);
            done();
        });
    });
});
