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

        this.pendinTests = testCases.slice();
        tasks[this.id]   = this;
    }

    get currentTestUrl () {
        var testName = this.pendinTests[0]['test'];

        return `http://home.example.org:8888/test?taskId=${this.id}&name=${testName}`;
    }
}

app.engine('handlebars', hndlb());
app.set('views', 'lib/views');
app.set('view engine', 'handlebars');

app.get('/test', (req, res) => {
    // TODO
    res.render('test')
});

app.get('/delete-cookies', (req, res) => res.render('delete-cookies'));

app.get('/run-tests', (req, res) => {
    var task = new TestTask(req.headers['user-agent']);

    res.redirect(task.currentTestUrl);
});

app.listen(8888);