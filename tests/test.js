'use strict'
var path = require('path');
var winstonConf = require('winston-config');
var winston = require('winston');
global.conf = require('../config/appsettings');
var redis = require('redis');
var bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
var redisClient = redis.createClient({
    host: global.conf.redisHost,
    port: 6379
});

winstonConf.fromFileSync(path.join(__dirname, '../config/winston-config.json'), function(error) {
    if (error) {
        console.log('error during winston configuration');
    } else {
        console.log('everything alright');
    }
});

var testLogger = winston.loggers.get('test');

var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var app = require('../server.js');
var request = require('request-promise');

describe('Hello World Test', function() {
    it('Redis sanity test', function*() {
        yield redisClient.setAsync('test', 'true');
        var reply = yield redisClient.getAsync('test');
        expect(reply).to.eql('true');
    });
    it('POST and GET from Redis', function*() {
        var testMessage = "This is a test";
        var testId = "testId";
        var payload = {
            message: testMessage
        };

        yield request({
            method: 'POST',
            body: payload,
            json: true,
            uri: `http://localhost:3000/${testId}`
        });

        var reply = yield request(`http://localhost:3000/${testId}`);
        expect(reply).to.eql(testMessage);
    });
});
