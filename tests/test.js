'use strict'
var path = require('path');
var winstonConf = require('winston-config');
var winston = require('winston');
global.conf = require('../config/appsettings');
var awsPromised = require('aws-promised');
var docClient = awsPromised.dynamoDb({
    region: "us-east-1"
});
var tableName = 'HelloWorld';

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
    it('Dynamo sanity test', function*() {
        var testMessage = 'This is a unit test';
        var testId = 'test';
        var updateEntry = {
            'TableName': tableName,
            'Key': {
                'id': {
                    'S': testId
                }
            },
            'ExpressionAttributeValues': {
                ':t': {
                    'S': String(testMessage)
                }
            },
            'UpdateExpression': 'SET message = :t'
        }
        yield docClient.updateItemPromised(updateEntry);

        var params = {
            AttributesToGet: [
                "message"
            ],
            TableName: tableName,
            Key: {
                "id": {
                    "S": testId
                }
            }
        }

        var dynamoItem = yield docClient.getItemPromised(params);
        expect(dynamoItem).to.be.not.empty;
        expect(dynamoItem.Item.message.S).to.eql(testMessage);


    });
    it('POST and GET from Dynamo', function*() {
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
