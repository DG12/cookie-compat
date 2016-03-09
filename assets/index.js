function createHeaderCell ($headerRow, content) {
    return $('<th>')
        .append(content)
        .appendTo($headerRow)
        .addClass('text-center');
}

function createHeader ($table, results) {
    var $head      = $('<thead>').prependTo($table);
    var $headerRow = $('<tr>').appendTo($head);

    createHeaderCell($headerRow, 'IETF test');
    createHeaderCell($headerRow, 'Expected');

    Object.keys(results).forEach(function (browser) {
        createHeaderCell($headerRow, browser);
    });
}

function sortByDesc (arr, fn) {
    return arr.sort(function (a, b) {
        var aVal = fn(a);
        var bVal = fn(b);

        if (aVal === bVal)
            return 0;

        return aVal > bVal ? -1 : 1;
    });
}

function shapeRowData (results) {
    var browsers = Object.keys(results);

    browsers = sortByDesc(browsers, function (browser) {
        return Object.keys(results[browser].failingTests).length;
    });

    var dataPerTest = browsers.reduce(function (data, browser, browserIdx) {
        var failingTests = results[browser].failingTests;

        Object.keys(failingTests).forEach(function (testName) {
            var test = failingTests[testName];

            if (!data[testName]) {
                data[testName] = {
                    name:             testName,
                    cookies:          test.cookies,
                    expected:         test.expected,
                    urlTested:        test.urlTested,
                    actualPerBrowser: Array.apply(null, Array(browsers.length))
                };
            }

            data[testName].actualPerBrowser[browserIdx] = test.actual;
        });

        return data;
    }, {});

    var rows = Object.keys(dataPerTest).map(function (testName) {
        return dataPerTest[testName];
    });

    return sortByDesc(rows, function (row) {
        var fails = row.actualPerBrowser.filter(function (actual) {
            return actual !== void 0;
        });

        return fails.length;
    });
}

function createCell ($row, content) {
    return $('<td>')
        .append(content)
        .appendTo($row);
}

function createDataRow ($tbody, row) {
    var $row = $('<tr>').appendTo($tbody);

    var $testCell = createCell($row, $('<u>').append(row.name))
        .append('<br>')
        .append($('<strong>').append('Set cookie:'));

    row.cookies.forEach(function (c) {
        $testCell
            .append('<br>')
            .append($('<code>').append('"' + c + '"'));
    });

    if (row.urlTested !== 'http://home.example.org:8888/cookie-parser-result') {
        $testCell
            .append('<br>')
            .append($('<strong>').append('Results URL:'))
            .append('<br>');

        $testCell.append($('<a>').attr('href', '#').append(row.urlTested));
    }

    createCell($row, $('<code>').append('"' + row.expected + '"'))
        .addClass('text-center');


    row.actualPerBrowser.forEach(function (actual) {
        var content = actual === void 0 ?
                      $('<span>').addClass('glyphicon glyphicon-ok') :
                      $('<code>').append('"' + actual + '"');

        createCell($row, content)
            .addClass(actual === void 0 ? 'success' : 'danger')
            .addClass('text-center');
    });
}

$.get('data/results.json', function (results) {
    $(document).ready(function () {
        var $table = $('#data');
        var $tbody = $('<tbody>').appendTo($table);

        createHeader($table, results);

        shapeRowData(results).forEach(function (row) {
            createDataRow($tbody, row);
        });

        $table.stickyTableHeaders();
    });
});