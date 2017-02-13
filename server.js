var express = require('express');
var path = require('path');
var winstonConf = require('winston-config');
var winston = require('winston');
var co = require('co');
var fs = require('fs');
global.conf = require('./config/appsettings');
var bodyParser = require('body-parser')
var awsPromised = require('aws-promised');
var docClient = awsPromised.dynamoDb({
    region: "us-east-1"
});
var tableName = 'HelloWorld';

winstonConf.fromFileSync(path.join(__dirname, './config/winston-config.json'), function(error) {
    if (error) {
        console.log('error during winston configuration');
    } else {
        console.log('everything alright');
    }
});

var appLogger = winston.loggers.get('application');

class App {
    * run() {
        this.app = express();
        this.app.use(bodyParser.json());
        this.app.get('/:id/', function(req, res) {
            co(function*() {
                var id = req.params.id;
                appLogger.verbose(`Id = ${id}`);

                var params = {
                    AttributesToGet: [
                        "message"
                    ],
                    TableName: tableName,
                    Key: {
                        "id": {
                            "S": id
                        }
                    }
                }

                var dynamoItem = yield docClient.getItemPromised(params);
                if ('Item' in dynamoItem) {
                    var message = dynamoItem.Item.message.S;
                    appLogger.verbose(`Message stored in DynamoDB = ${message}`);
                    res.send(message);
                } else {
                    res.sendStatus(404);
                }
            });
        });

        this.app.post('/:id/', function(req, res) {
            co(function*() {
                var id = req.params.id;
                appLogger.verbose(`Id = ${id}`);
                var message = req.body.message;
                appLogger.verbose(`Message = ${message}`);

                var updateEntry = {
                    'TableName': tableName,
                    'Key': {
                        'id': {
                            'S': id
                        }
                    },
                    'ExpressionAttributeValues': {
                        ':t': {
                            'S': String(message)
                        }
                    },
                    'UpdateExpression': 'SET message = :t'
                }
                try {
                    appLogger.verbose('Adding to DyanmoDB');
                    yield docClient.updateItemPromised(updateEntry);
                    appLogger.verbose('Added to DyanmoDB');
                } catch (e) {
                    appLogger.error(`Failed to add entry to DynamoDB table ${tableName}`, e);
                    res.sendStatus(500);
                }

                res.sendStatus(204);
            })

        });

        this.app.listen(3000, function() {
            appLogger.info('Example app listening on port 3000!');
        });
    }
}

co(function*() {
        if (!fs.existsSync(global.conf.logFolder)) {
            fs.mkdirSync(global.conf.logFolder);
        }
        // eslint-disable-next-line
        var app = new App();
        // eslint-disable-next-line
        yield app.run();
        // eslint-disable-next-line
    })
    .catch(function(err) {
        appLogger.error(err);
    });

module.exports = App;
