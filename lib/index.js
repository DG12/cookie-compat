'use strict';

const fs      = require('fs');
const chalk   = require('chalk');
const parseUA = require('useragent').parse;
const express = require('express');
const hndlb   = require('express-handlebars');

const TEST_URL = 'http://home.example.org:8888/test';

let server      = null;
const app       = express();
const testCases = JSON.parse(fs.readFileSync('data/test-cases.json').toString());

const task = {
    ua: null,

    pendingTests: testCases.map(testCase => ({
        name:            testCase['test'],
        expected:        testCase['sent-raw'],
        cookies:         JSON.stringify(testCase['received']),
        forcedResultUrl: testCase['sent-to'],
        resultUrl:       testCase['sent-to'] ? testCase['sent-to'] : 'http://home.example.org:8888/cookie-parser-result'
    })),

    get currentTest () {
        return this.pendingTests[0];
    }
};

app.engine('handlebars', hndlb());
app.set('views', 'lib/views');
app.set('view engine', 'handlebars');

app.get('*', (req, res, next) => {
    res.set('cache-control', 'no-cache, no-store, must-revalidate');
    next();
});

app.get('/test', (req, res) => {
    res.render('test', {
        cookies:   task.currentTest.cookies,
        resultUrl: task.currentTest.resultUrl
    });
});

function logTestResults (test, actual) {
    if (actual === test.expected)
        console.log(`${chalk.bold(test.name)} - ${chalk.green('PASS')}`);
    else {
        console.log(`${chalk.bold(test.name)} - ${chalk.red('FAIL')}`);
        console.log('Test case:');
        console.log(chalk.gray(test.cookies));

        if (test.forcedResultUrl) {
            console.log('Results observed on page:');
            console.log(chalk.gray(test.forcedResultUrl));
        }

        console.log('Expected:');
        console.log(chalk.gray(test.expected));
        console.log('Actual:');
        console.log(chalk.gray(actual));
        console.log('----------------');
    }
}

function parserResult (req, res) {
    if (req.query.delete) {
        res.render('delete-cookies');
        return;
    }

    let actual = req.headers['cookie'] || '';

    // NOTE: node exposes HTTP headers in ASCII
    actual = (new Buffer(actual, 'ascii')).toString('utf8');

    logTestResults(task.currentTest, actual);

    task.pendingTests.shift();

    if (task.currentTest)
        res.redirect(TEST_URL);
    else {
        res.end('Done!');

        setTimeout(() => server.close(), 0);
    }
}

app.get('/cookie-parser-result/*', parserResult);
app.get('/cookie-parser-result', parserResult);

app.get('/run-tests', (req, res) => {
    task.ua = parseUA(req.headers['user-agent']);

    console.log(`Running tests in ${task.ua.family} (v${task.ua.toVersion()})...`);
    console.log('===============================================================');

    res.redirect(TEST_URL);
});

server = app.listen(8888, () => {
    console.log(`Open ${chalk.gray.underline('http://example.org:8888/run-tests')} to start testing.`);
});