'use strict';

const fs      = require('fs');
const chalk   = require('chalk');
const iconv   = require('iconv-lite');
const uuid    = require('node-uuid');
const parseUA = require('useragent').parse;
const express = require('express');
const hndlb   = require('express-handlebars');

const app       = express();
const tasks     = {};
const testCases = JSON.parse(fs.readFileSync('data/test-cases.json').toString());

class TestTask {
    constructor (userAgent) {
        this.id = uuid.v4();
        this.ua = parseUA(userAgent);

        this.pendingTests = testCases.map(testCase => ({
            name:            testCase['test'],
            expected:        testCase['sent-raw'],
            cookies:         JSON.stringify(testCase['received']),
            forcedResultUrl: testCase['sent-to'],
            resultUrl:       testCase['sent-to'] ?
                             testCase['sent-to'] + `&taskId=${this.id}` :
                             `http://home.example.org:8888/cookie-parser-result?taskId=${this.id}`
        }));

        this.fails = [];
    }

    get testUrl () {
        return `http://home.example.org:8888/test?taskId=${this.id}`;
    }

    get currentTest () {
        return this.pendingTests[0];
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
    const task = tasks[req.query.taskId];

    res.render('test', {
        cookies:   task.currentTest.cookies,
        resultUrl: task.currentTest.resultUrl
    });
});

function parserResult (req, res) {
    if (req.query.delete) {
        res.render('delete-cookies');
        return;
    }

    const task        = tasks[req.query.taskId];
    const currentTest = task.currentTest;
    let actual        = req.headers['cookie'] || '';

    // NOTE: node exposes HTTP headers in ASCII
    actual = (new Buffer(actual, 'ascii')).toString('utf8');

    if (actual === currentTest.expected)
        console.log(`${chalk.bold(currentTest.name)} - ${chalk.green('PASS')}`);
    else {
        console.log(`${chalk.bold(currentTest.name)} - ${chalk.red('FAIL')}`);
        console.log('Test case:');
        console.log(chalk.gray(currentTest.cookies));

        if (currentTest.forcedResultUrl) {
            console.log('Results observed on page:');
            console.log(chalk.gray(currentTest.forcedResultUrl));
        }

        console.log('Expected:');
        console.log(chalk.gray(currentTest.expected));
        console.log('Actual:');
        console.log(chalk.gray(actual));
        console.log('----------------');
    }

    task.pendingTests.shift();

    if (task.currentTest)
        res.redirect(task.testUrl);
    else
        res.end('Done!');
}

app.get('/cookie-parser-result/*', parserResult);
app.get('/cookie-parser-result', parserResult);

app.get('/run-tests', (req, res) => {
    const task = new TestTask(req.headers['user-agent']);

    tasks[task.id] = task;

    console.log(`Running tests in ${task.ua.family} (v${task.ua.toVersion()})...`);
    console.log('===============================================================');

    res.redirect(task.testUrl);
});

app.listen(8888);