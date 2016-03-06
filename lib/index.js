const path    = require('path');
const express = require('express');
const hndlb   = require('express-handlebars');

var app = express();

app.engine('handlebars', hndlb());
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'handlebars');

app.get('/test', (req, res) => res.render('test'));
app.get('/delete-cookies', (req, res) => res.render('delete-cookies'));

app.listen(8888);