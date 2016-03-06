const path    = require('path');
const express = require('express');
const hndlb   = require('express-handlebars');

var app = express();

app.engine('handlebars', hndlb());
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'handlebars');

app.get('/', function (req, res) {
    res.render('index');
});

app.listen(8888);