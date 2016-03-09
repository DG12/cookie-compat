function createHeaderCell ($headerRow, html) {
    $headerRow.append('<th></th>');

    $headerRow.find('th:last').append(html);
}

function createHeader ($table, results) {
    $table.prepend('<thead></thead>');

    var $head = $table.find('thead');

    $head.append('<tr></tr>');

    var $headerRow = $head.find('tr');

    createHeaderCell($headerRow, 'IETF test case');
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
                    actualPerBrowser: Array(browsers.length)
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

function createDataRow ($tbody, row) {
    $tbody.append('<tr></tr>');

    var $tr = $tbody.find('tr:last');
    // TODO
}

$.get('data/results.json', function (results) {
    $(document).ready(function () {
        var $table = $('#data');

        $table.append('<tbody></tbody>');

        var $tbody = $table.find('tbody');

        createHeader($table, results);

        var rowData = shapeRowData(results);
    });
});