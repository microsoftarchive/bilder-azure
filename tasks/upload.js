module.exports = function (grunt) {

  'use strict';

  var fs = require('fs');
  var path = require('path');

  var async = require('async');

  var defaults = require('../lib/defaults');
  var hashFile = require('../lib/hashFile');
  var upload = require('../lib/uploadFile');

  var encodingOptions = { 'encoding': 'utf8' };

  function processFile (options, file, callback) {
    // get the absolute path
    var original = file;
    var name = path.basename(original);
    var local = path.resolve(options.baseDir, file);

    // resolve the file, if it's a sym-link
    var fileStat = fs.lstatSync(local);
    while (fileStat && fileStat.isSymbolicLink() && !fileStat.isFile()) {
      local = path.resolve(path.dirname(local), fs.readlinkSync(local));
      fileStat = fs.lstatSync(local);
    }

    function done (err, remote) {
      if (err) {
        grunt.log.error('\u2717'.red, name);
      } else {
        grunt.log.ok('\u2713'.green, name);
      }
      callback(null, remote);
    }

    var prefix = options.prefix;
    var args = [
      name,
      local,
      null,
      done
    ];

    hashFile(local, function (err, shasum) {
      // path on the bucket
      var remote = args[2] = options.hash ?
                path.join(prefix, shasum, original)
               :path.join(prefix, original);

      // skip upload, if already uploaded
      if (options.hash && upload.cache[remote]) {
        grunt.log.debug('\u25C8'.yellow, name);
        return callback(null, remote);
      }
      // everything else, just upload it right away
      else {
        grunt.log.debug('uploading %s to %s', local, remote);
        upload.apply(null, args);
      }
    });
  }

  function AzureUploadTask () {

    var that = this;

    var options = this.options(defaults);
    var done = that.async();

    var files = grunt.file.expand({
      'cwd': options.baseDir
    }, that.data.src);

    // init the uploader
    upload.init({
      'account': options.account,
      'key': options.key,
      'secret': options.secret,
      'connection': options.connection,
      'container': options.container
    });

    var max = options.throttle;
    var fn = processFile.bind(null, options);
    async.mapLimit(files, max, fn, function (err, remotes) {

      // save the hashes
      if (options.hash) {
        var map = {};
        remotes.forEach(function (remote, index) {
          map[files[index]] = remote;
        });
        var mapFile = path.resolve(options.buildDir, that.target + '.json');
        var data = JSON.stringify(map, null, 2);
        fs.writeFileSync(mapFile, data, encodingOptions);
      }

      setTimeout(done, 200);
    });
  }

  grunt.registerMultiTask('bilder/upload',
      'Upload to a Azure container', AzureUploadTask);
};
