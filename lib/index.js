'use strict';

const fs      = require('fs');
const chalk   = require('chalk');
const uuid    = require('node-uuid');
const parseUA = require('useragent').parse;
const express = require('express');
const hndlb   = require('express-handlebars');

var app       = express();
var tasks     = {};
var testCases = JSON.parse(fs.readFileSync('data/test-cases.json').toString());

class TestTask {
    constructor (userAgent) {
        this.id = uuid.v4();
        this.ua = parseUA(userAgent);

        this.pendingTests = testCases.slice();
        this.fails        = [];
    }

    get testUrl () {
        return `http://home.example.org:8888/test?taskId=${this.id}`;
    }

    get currentTestName () {
        return this.pendingTests[0]['test'];
    }

    get currentTestExpected () {
        return this.pendingTests[0]['sent-raw'];
    }

    get currentTestCookies () {
        return JSON.stringify(this.pendingTests[0]['received']);
    }

    get currentTestResultUrl () {
        var url = this.pendingTests[0]['sent-to'];

        return url ?
               url + `&taskId=${this.id}` :
               `http://home.example.org:8888/cookie-parser-result?taskId=${this.id}`;
    }
}

app.engine('handlebars', hndlb());
app.set('views', 'lib/views');
app.set('view engine', 'handlebars');

app.get('*', (req, res, next) => {
    res.set('cache-control', 'no-cache, no-store, must-revalidate');
    next();
});

app.get('/test', (req, res) => {
    var task = tasks[req.query.taskId];

    res.render('test', {
        cookies:   task.currentTestCookies,
        resultUrl: task.currentTestResultUrl
    });
});

function parserResult (req, res) {
    var task     = tasks[req.query.taskId];
    var actual   = req.headers['cookie'] || '';
    var expected = task.currentTestExpected;

    if (actual === expected)
        console.log(`${chalk.bold(task.currentTestName)} - ${chalk.green('PASS')}`);
    else {
        console.log(`${chalk.bold(task.currentTestName)} - ${chalk.red('FAIL')}`);
        console.log('Test case:');
        console.log(chalk.gray(task.currentTestCookies));
        console.log('Expected:');
        console.log(chalk.gray(expected));
        console.log('Actual:');
        console.log(chalk.gray(actual));
        console.log('----------------');
    }

    task.pendingTests.shift();

    if (task.pendingTests.length)
        res.redirect(task.testUrl);
    else
        res.end('Done!');
}

app.get('/cookie-parser-result/*', parserResult);
app.get('/cookie-parser-result', parserResult);

app.get('/delete-cookies', (req, res) => res.render('delete-cookies'));

app.get('/run-tests', (req, res) => {
    var task = new TestTask(req.headers['user-agent']);

    tasks[task.id] = task;

    console.log(`Running tests in ${task.ua.family} (v${task.ua.toVersion()})...`);
    console.log('===============================================================');

    res.redirect(task.testUrl);
});

app.listen(8888);