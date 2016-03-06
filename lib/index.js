'use strict';

const fs      = require('fs');
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
        tasks[this.id]    = this;
    }

    get testUrl () {
        return `http://home.example.org:8888/test?taskId=${this.id}`;
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

app.get('/test', (req, res) => {
    var task = tasks[req.query.taskId];

    res.set('cache-control', 'no-cache, no-store, must-revalidate');

    res.render('test', {
        cookies:   task.currentTestCookies,
        resultUrl: task.currentTestResultUrl
    });
});

app.get('/delete-cookies', (req, res) => res.render('delete-cookies'));

app.get('/run-tests', (req, res) => {
    var task = new TestTask(req.headers['user-agent']);

    res.redirect(task.testUrl);
});

app.listen(8888);