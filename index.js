process.env["NTBA_FIX_319"] = 1;

const TelegramBot = require('node-telegram-bot-api');
const config = require('config');
const requireFu = require('require-fu');
const scheduler = require('node-schedule');
const MongoClient = require('mongodb').MongoClient;
const array_rand = require('unique-random-array');
const sleep = require('sleep');

const bot = new TelegramBot(config.token, { polling: true });

const url = 'mongodb://' + config.db.user + ':' + config.db.pwd + '@' + config.db.host + ':' + config.db.port + '/' + config.db.database;
const dbName = config.db.database;

MongoClient.connect(url, { useNewUrlParser: true }, async function (err, client) {

    const db = client.db(dbName);

    requireFu(`${__dirname}/commands`)(bot, config, db, array_rand, sleep);
    requireFu(`${__dirname}/scheduler`)(bot, config, db, scheduler);

    process.on('SIGINT', async () => {
        await client.close(false);
        process.exit();
    });

});