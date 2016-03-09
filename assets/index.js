function createHeaderCell ($headerRow, content) {
    return $('<th>')
        .append(content)
        .appendTo($headerRow)
        .addClass('text-center');
}

function addFailedSucceeded ($elem, failed, succeeded) {
    $elem
        .append('<br>')
        .append($('<span>').append(failed).addClass('fail-text'))
        .append(' / ')
        .append($('<span>').append(succeeded).addClass('success-text'));
}

function createHeader ($table, results, browsers, testsTotal) {
    var $head      = $('<thead>').prependTo($table);
    var $headerRow = $('<tr>').appendTo($head);

    createHeaderCell($headerRow, 'IETF test');
    createHeaderCell($headerRow, 'Expected');

    browsers.forEach(function (browser) {
        var browserData = results[browser];
        var failed      = Object.keys(browserData.failingTests).length;
        var succeeded   = testsTotal - failed;

        var $cell = createHeaderCell($headerRow, browser)
            .append($('<span>').append('(v' + browserData.version + ')').addClass('browser-version'));

        addFailedSucceeded($cell, failed, succeeded);
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

function shapeRowData (results, browsers) {
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
    var $row    = $('<tr>').appendTo($tbody);
    var $anchor = $('<a>')
        .attr('id', row.name)
        .attr('href', '#' + row.name)
        .addClass('test-anchor')
        .append('#');

    var $testCell = createCell($row, '')
        .append($('<u>').append(row.name))
        .append($anchor);

    var failed = row.actualPerBrowser.filter(function (a) {
        return a !== void 0;
    }).length;

    var succeeded = row.actualPerBrowser.length - failed;

    addFailedSucceeded($testCell, failed, succeeded);

    $testCell
        .append('<br><br>')
        .append($('<i>').append('Set cookie:'));

    row.cookies.forEach(function (c) {
        $testCell
            .append('<br>')
            .append($('<code>').append('"' + c + '"'));
    });

    if (row.urlTested !== 'http://home.example.org:8888/cookie-parser-result') {
        $testCell
            .append('<br><br>')
            .append($('<i>').append('Results URL:'))
            .append('<br>');

        $testCell.append($('<a>').attr('href', 'javascript:void 0').append(row.urlTested));
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
        var $table   = $('#data');
        var $tbody   = $('<tbody>').appendTo($table);
        var browsers = Object.keys(results);

        browsers = sortByDesc(browsers, function (browser) {
            return Object.keys(results[browser].failingTests).length;
        });

        var rowData = shapeRowData(results, browsers);

        createHeader($table, results, browsers, rowData.length);

        rowData.forEach(function (row) {
            createDataRow($tbody, row);
        });

        $table.stickyTableHeaders();
    });
});