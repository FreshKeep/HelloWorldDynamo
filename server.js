var express = require('express');
var path = require('path');
var winstonConf = require('winston-config');
var winston = require('winston');
var co = require('co');
var fs = require('fs');
global.conf = require('./config/appsettings');
var redis = require('redis');
var bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
var redisClient = redis.createClient({
    host: global.conf.redisHost,
    port: 6379
});
var bodyParser = require('body-parser')

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
                var message = yield redisClient.getAsync(id);
                appLogger.verbose(`Message stored in Redis = ${message}`);
                if (message === null) {
                    res.sendStatus(404);
                } else {
                    res.send(message);
                }
            });
        });

        this.app.post('/:id/', function(req, res) {
            co(function*() {
                var id = req.params.id;
                appLogger.verbose(`Id = ${id}`);
                var message = req.body.message;
                appLogger.verbose(`Message = ${message}`);
                yield redisClient.setAsync(id, message);
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
