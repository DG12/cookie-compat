'use strict';

const fs       = require('fs');
const pathJoin = require('path').join;
const chalk    = require('chalk');
const parseUA  = require('useragent').parse;
const express  = require('express');
const hndlb    = require('express-handlebars');

const TEST_URL = 'http://home.example.org:8888/test';

const PATHS = [
    '/cookie-parser-result/foo/bar',
    '/cookie-parser-result/foo',
    '/cookie-parser-result/foo/qux',
    '/cookie-parser-result/foo/qux/',
    '/cookie-parser-result/foo/',
    '/cookie-parser-result/foo/qux;',
    '/cookie-parser-result/',
    '/cookie-parser-result',
    '/',
    '/='
];

const DOMAINS = [
    'http://example.org:8888',
    'http://home.example.org:8888',
    'http://home.example.org.:8888',
    'http://sibling.example.org:8888',
    'http://subdomain.home.example.org:8888',
    'http://sibling.home.example.org:8888'
];

// NOTE: use pre-rendered clean up iframes markup to speed up things a little bit
const CLEAN_UP_IFRAMES_HTML = DOMAINS.reduce((html, domain) => {
    return PATHS.reduce((html, path) => html + `<iframe src="${domain}${path}?delete=true"></iframe>`, html);
}, '');


const app       = express();
const testCases = JSON.parse(fs.readFileSync(pathJoin(__dirname, '../data/test-cases.json')).toString());

const task = {
    ua:           null,
    failingTests: {},

    pendingTests: testCases.map(testCase => ({
        name:      testCase['test'],
        expected:  testCase['sent-raw'],
        cookies:   JSON.stringify(testCase['received']),
        resultUrl: testCase['sent-to'] ? testCase['sent-to'] : 'http://home.example.org:8888/cookie-parser-result'
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

    if (req.query.delete)
        res.render('delete-cookies');
    else
        next();
});

app.get('/test', (req, res) => {
    res.render('test', {
        cookies:            task.currentTest.cookies,
        resultUrl:          task.currentTest.resultUrl,
        cleanUpIFramesHtml: CLEAN_UP_IFRAMES_HTML
    });
});

function logTestResults (test, actual) {
    if (actual === test.expected)
        console.log(`${chalk.bold(test.name)} - ${chalk.green('PASS')}`);
    else {
        console.log(`${chalk.bold(test.name)} - ${chalk.red('FAIL')}`);

        console.log('Test case:');
        console.log(chalk.gray(test.cookies));

        console.log('Results observed on page:');
        console.log(chalk.gray(test.resultUrl));

        console.log('Expected:');
        console.log(chalk.gray(test.expected));

        console.log('Actual:');
        console.log(chalk.gray(actual));

        console.log('----------------');

        task.failingTests[test.name] = {
            cookies:   JSON.parse(test.cookies),
            urlTested: test.resultUrl,
            expected:  test.expected,
            actual:    actual
        };
    }
}

function saveResults () {
    const resultsFile = pathJoin(__dirname, '../data/results.json');
    const results     = JSON.parse(fs.readFileSync(resultsFile).toString());

    results[task.ua.family] = {
        version:      task.ua.toVersion(),
        failingTests: task.failingTests
    };

    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
}

function parserResult (req, res) {
    let actual = req.headers['cookie'] || '';

    // NOTE: node exposes HTTP headers in ASCII
    actual = (new Buffer(actual, 'ascii')).toString('utf8');

    logTestResults(task.currentTest, actual);

    task.pendingTests.shift();

    if (task.currentTest)
        res.redirect(TEST_URL);
    else {
        res.end('Done!');

        if (process.argv.indexOf('--save') > -1)
            saveResults();

        setTimeout(() => process.exit(0), 0);
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

app.listen(8888, () => {
    console.log(`Open ${chalk.gray.underline('http://example.org:8888/run-tests')} to start testing.`);
});