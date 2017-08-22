var gulp = require('gulp');
var file = require('gulp-file');
var rollup = require('rollup');
var babel = require('rollup-plugin-babel');
var minify = require('rollup-plugin-babel-minify');

gulp.task('build', function () {
  return rollup.rollup({
    input: 'src/index.js',
    plugins: [
      babel({
        presets: [
          [
            "es2015", {
              "modules": false
            }
          ]
        ],
        babelrc: false,
        exclude: 'node_modules/**'
      })
    ]
  })
  .then(bundle => {
    return bundle.generate({
      format: 'umd',
      name: 'RadarChart'
    })
  })
  .then(gen => {
    return file('RadarChart.js', gen.code, {src: true})
      .pipe(gulp.dest('dist/'))
  });
});

gulp.task('compress', function () {
  return rollup.rollup({
    input: 'src/index.js',
    plugins: [
      babel({
        presets: [
          [
            "es2015", {
              "modules": false
            }
          ],
          ["minify"]
        ],
        babelrc: false,
        exclude: 'node_modules/**'
      })
    ]
  })
  .then(bundle => {
    return bundle.generate({
      format: 'umd',
      name: 'RadarChart'
    })
  })
  .then(gen => {
    return file('RadarChart.min.js', gen.code, {src: true})
      .pipe(gulp.dest('dist/'))
  });
});

gulp.task('default', ['build']);
