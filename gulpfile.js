'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');

var port = gutil.env.port || 3000;
var lrport = gutil.env.lrport || 35729;
var browser = gutil.env.browser;

/*
 * Default task is to start the examples
 */
gulp.task('default', ['examples']);

gulp.task('examples', function () {
    var express = require('express');
    var app = express();

    app.use(require('connect-livereload')({
        port: lrport
    }));

    app.use(express.static('./'));

    app.listen(port, function () {
        var lrServer = require('gulp-livereload')();

        gulp.watch(['dist/**/*.*', './demo.*', './index.html']).on('change', function (file) {
            console.log('Reload', file.path);
            lrServer.changed(file.path);
        });

        // open the browser
        require('open')('http://localhost:' + port, browser);

        console.log('Example app started on port [%s]', port);
    });
});
