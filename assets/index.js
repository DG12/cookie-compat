(function () {
    // Const
    // ---------------------------------------------
    var GROUPS = {
        'de-facto':              {
            text: 'De facto standard',
            cls:  'label label-success',
            sortIdx: 5
        },
        'all-no-consensus':      {
            text: 'All / no consensus',
            cls:  'label label-primary',
            sortIdx: 4
        },
        'majority':              {
            text: 'Majority',
            cls:  'label label-info',
            sortIdx: 3
        },
        'majority-no-consensus': {
            text: 'Majority / no consensus',
            cls:  'label label-default',
            sortIdx: 2
        },
        'minority':              {
            text: 'Minority - possible bug',
            cls:  'label label-warning',
            sortIdx: 1
        },
        'bug':                   {
            text: 'Bug',
            cls:  'label label-danger',
            sortIdx: 0
        }
    };


    // Data
    // ---------------------------------------------
    function sortByDesc (arr, fn) {
        return arr.sort(function (a, b) {
            var aVal = fn(a);
            var bVal = fn(b);

            if (aVal === bVal)
                return 0;

            return aVal > bVal ? -1 : 1;
        });
    }

    function isArrUnique (arr) {
        return !!arr.reduce(function (a, b) {
            return a === b ? a : false;
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
                        actualPerBrowser: Array.apply(null, Array(browsers.length)),
                        group:            null,
                        failed:           0,
                        succeeded:        0
                    };
                }

                data[testName].actualPerBrowser[browserIdx] = test.actual;
            });

            return data;
        }, {});

        var rows = Object.keys(dataPerTest).map(function (testName) {
            return calcRowStats(dataPerTest[testName]);
        });

        return sortByDesc(rows, function (row) {
            return GROUPS[row.group].sortIdx + '' + row.failed;
        });
    }

    function calcRowStats (row) {
        var total = row.actualPerBrowser.length;
        var half  = Math.ceil(total / 2);

        var failedActuals = row.actualPerBrowser.filter(function (a) {
            return a !== void 0;
        });

        row.failed    = failedActuals.length;
        row.succeeded = total - row.failed;

        if (row.failed === total) {
            if (isArrUnique(failedActuals))
                row.group = 'de-facto';
            else
                row.group = 'all-no-consensus';
        }

        else if (row.failed >= half) {
            if (isArrUnique(failedActuals))
                row.group = 'majority';
            else
                row.group = 'majority-no-consensus';
        }
        else if (row.failed === 1)
            row.group = 'bug';
        else
            row.group = 'minority';

        return row;
    }

    // Rendering
    // ---------------------------------------------
    function addFailedSucceeded ($elem, failed, succeeded) {
        $elem
            .append($('<span>').append(failed).addClass('fail-text'))
            .append(' : ')
            .append($('<span>').append(succeeded).addClass('success-text'));
    }


    function createHeaderCell ($headerRow, content) {
        return $('<th>')
            .append(content)
            .appendTo($headerRow)
            .addClass('text-center');
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
                .append($('<span>').append('(v' + browserData.version + ')').addClass('browser-version'))
                .append('<br>');

            addFailedSucceeded($cell, failed, succeeded);
        });
    }

    function createCell ($row, content) {
        return $('<td>')
            .append(content)
            .appendTo($row);
    }

    function createTestCell (row, $row) {
        var $anchor = $('<a>')
            .attr('id', row.name)
            .attr('href', '#' + row.name)
            .addClass('test-anchor')
            .append('#');

        var $testCell = createCell($row, '')
            .append($('<u>').append(row.name))
            .append($anchor);

        var group = GROUPS[row.group];

        $testCell
            .append('<br>')
            .append($('<span>').append(group.text).addClass(group.cls))
            .append(' (');

        addFailedSucceeded($testCell, row.failed, row.succeeded);

        $testCell
            .append(')')
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
    }

    function createDataRow ($tbody, row) {
        var $row = $('<tr>').appendTo($tbody);

        createTestCell(row, $row);

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
})();