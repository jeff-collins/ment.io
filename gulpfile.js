'use strict';

const { series } = require('gulp');
var gulp = require('gulp');
var log = require('fancy-log');
var fs = require('fs');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var argv = require('minimist')(process.argv);
var templateCache = require('gulp-angular-templatecache');
var gjshint = require('gulp-jshint');
var ngAnnotate = require('gulp-ng-annotate');
var stylish = require('jshint-stylish');

var port = 3000;
var covport = 3001;
var lrport = 35729;
var openBrowser;
var bump = require('gulp-bump');

async function tpl() {
    return gulp.src('src/**/*.tpl.html')
        .pipe(templateCache({
            module: 'mentio'
        }))
        .pipe(gulp.dest('src'));
};

function dist () {
    return gulp.src([
        'src/mentio.directive.js',
        'src/mentio.service.js',
        'src/templates.js'
    ])
    .pipe(gjshint())
    .pipe(gjshint.reporter(stylish))
    .pipe(ngAnnotate())
    .pipe(concat('mentio.js'))
    .pipe(gulp.dest('dist'))
    .pipe(uglify())
    .pipe(concat('mentio.min.js'))
    .pipe(gulp.dest('dist')).on('end', function(){ log('Done!'); });
};

async function copy() {
    log('copy');
    gulp.src(['bower_components/angular-ui-tinymce/src/tinymce.js'])
    .pipe(gulp.dest('ment.io'))
};

async function site () {
    var express = require('express');
    var app = express();

    app.use(require('connect-livereload')({
        port: lrport
    }));

    app.use(express.static('./'));

    app.listen(port, function () {
        var lrServer = require('gulp-livereload')();

        gulp.watch(['src/**/*.*', 'ment.io/*.*'], dist).on('change', function (file) {
            log('Reload', file.path);
            lrServer.changed(file.path);
        });

        // open the browser
        require('open')('http://localhost:' + port + '/ment.io', openBrowser);

        log('Example app started on port [%s]', port);
    });
};

async function jshint() {
    return gulp.src('src/**/*.js')
        .pipe(gjshint())
        .pipe(gjshint.reporter(stylish));
};

// Basic usage:
// Will patch the version
async function bump(){
  gulp.src(['./package.json', './bower.json'])
  .pipe(bump())
  .pipe(gulp.dest('./'));
};

function testTask (params) {
    var karma = require('gulp-karma');

    var karmaConfig = {
        configFile: './karma.conf.js',
        action: params.isWatch ? 'watch' : 'run'
    };

    if (params.coverageReporter) {
        karmaConfig.coverageReporter = params.coverageReporter;
    }

    if (params.reporters) {
        karmaConfig.reporters = params.reporters;
    }

    return gulp.src('DO_NOT_MATCH') //use the files in the karma.conf.js
        .pipe(karma(karmaConfig));
}

/**
 * Run the karma spec tests
 */
async function test() {
    testTask({
        isWatch: gutil.env.hasOwnProperty('watch')
    });
};

async function coveralls() {
    var coveralls = require('gulp-coveralls');

    gulp.src('./coverage/**/lcov.info')
      .pipe(coveralls());
};

async function coverage() {
    var express = require('express');
    var app = express();
    var coverageFile;
    var karmaHtmlFile;

    function getTestFile (path) {
        if (fs.existsSync(path)) {
            var files = fs.readdirSync(path);

            if (files) {
                for (var i = 0; i < files.length; i++) {
                    if (fs.lstatSync(path + '/' + files[i]).isDirectory()) {
                        return files[i];
                    } else {
                        return files[i];
                    }
                }
            }
        }
    }

    testTask({
        isWatch: gutil.env.hasOwnProperty('watch'),
        reporters: ['progress', 'coverage', 'threshold']
    });

    setTimeout(function () {
        coverageFile = getTestFile('coverage');
        karmaHtmlFile = getTestFile('karma_html');

        app.use(express.static('./'));

        app.listen(covport, function openPage () {
            if (coverageFile) {
                require('open')('http://localhost:' + covport + '/coverage/' + coverageFile);
            }
        });
    }, 3000);
};

exports.test = series(copy, tpl, dist, test);
exports.default = series(copy, tpl, dist, site);

