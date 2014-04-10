
var debug = require('debug')('scraper');
var defaults = require('defaults');
var Emitter = require('events').EventEmitter;
var inherit = require('util').inherits;
var mkdirp = require('mkdirp');
var path = require('path');
//var phantom = require('node-phantom-simple');
var phantom = require('node-phantom');
var cbutils = require('cb');

/**
 * Expose `create`.
 */

module.exports = create;

/**
 * Creates a `Scraper` instance.
 *
 * @param {Object} options
 * @param {Function} callback
 */

function create (options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = defaults(options, {
    port: 12300 + Math.floor(Math.random() * 10000), // defaults to a random port
    flags: ['--load-images=no'],
    imagedir: null,
    headers: { // disguise headers
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.71 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language' :'en-US,en;q=0.8',
      'cache-control'   :'max-age=0'
    }
  });

  if (options.imagedir) {
    debug('creating image directory for errors: %s', options.imagedir);
    mkdirp.sync(options.imagedir);
  }

  debug('creating phantom instance at port %d and flags %s ..', options.port, options.flags);
  // use fn.apply to pull flags out into args.
  var phantomArgs = {};
  if (options.flags) {
    var phantomParameters = {};
    options.flags.forEach(function(f) {
      var match = f.match(/--(.*)=(.*)/);
      if (match[1] && match[2]) {
        phantomParameters[match[1]] = match[2];
      }
    });
    phantomArgs.parameters = phantomParameters;
  }
  var scraper = new Scraper(options);
  scraper.bindPhantom(phantomArgs, function() {
    return callback(null, scraper);
  });
}

/**
 * Create a new `Scraper` instance.
 *
 * @param {Phantom} phantom
 */

function Scraper (options) {
  if (!(this instanceof Scraper)) return new Scraper(options);
  this.options = options;
}

/**
 * Inherit from `Emitter`.
 */

inherit(Scraper, Emitter);

Scraper.prototype.bindPhantom = function(options, callback) {
  var self = this;
  debug('binding new phantom to scraper');
  phantom.create(function (err, instance) {
    debug('created phantom instance');
    /*
    instance.process.stderr.on('data', function(data) {
      if (data.toString().indexOf('PhantomJS has crashed') !== -1) {
        /// on crash create a new instance and associate it with scraper
        debug('Phantom crashed - creating new instance');
        self.bindPhantom(options);
      }
    });
    */
    self.phantom = instance;
    if (callback) {
      callback();
    }
  });
};

/**
 * Open a page using the disguised headers.
 *
 * @param {Object} options
 * @param {Function} callback
 */

Scraper.prototype.page = function (options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = defaults(options, this.options);

  debug('creating disguised phantom page ..');

  this.phantom.createPage(function (err, page) {
    disguise(page, options.headers);
    debug('created disguised phantom page');
    // add a basic error handler
    page.onError = function(msg, trace) {
      debug('ERORR RECIEVED: %s', msg);
    };

    return callback(err, page);
  });
};

/**
 * Open a page using the disguised headers, load the
 * page at the `url`, and wait for
 * `document.readyState === 'complete'`
 * before returning the page.
 *
 * @param {String} url
 * @param {Object} options
 * @param {Function} callback
 */

Scraper.prototype.readyPage = function (url, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var self = this;
  this.page(options, function (err, page) {
    if (err) return callback(err);
    page.open(url, function (err, status) {
      debug('page %s opened with status %s', url, status);
      if (err) return callback(err);
      if (status !== 'success') {
        var statusError = new Error('Opening page ' + url +
          ' resulted in status ' + status);
        if (!self.options.imagedir) {
          debug('not saving error image since no imagedir');
          return callback(statusError);
        }

        // render a snapshot before throwing error.
        var filename = url.replace(/\//g, '_');
        filename = filename + '_' + Date.now() + '.jpg';
        filename = path.join(self.options.imagedir, filename);
        debug('saving error image from phantom to %s', filename);
        return page.render(filename, function() {
          debug('saved error image from phantom to %s', filename);
          callback(statusError);
        });
      }

      waitForReady(page, cbutils(function (err) {
        if (options.includeJquery) {
          return page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js', function() {
            callback(err, page);
          });
        } else {
          return callback(err, page);
        }
      }).timeout(1000 * 60).once()); // always call the callback within a minute and only call once
    });
  });
};

/**
 * Open a ready page at `url` and return the html.
 *
 * @param {String} url
 * @param {Object} options
 * @param {Function} callback
 */

Scraper.prototype.html = function (url, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  this.readyPage(url, options, function (err, page) {
    if (err) return callback(err);
    getPageHtml(page, function (err, html) {
      return callback(err, page, html);
    });
  });
};

/**
 * Return a map copy with all the keys lowercased.
 *
 * @param {Map} map
 * @return {Object}
 */

function lowercase (map) {
  var result = {};
  Object.keys(map).forEach(function (key) {
    result[key.toLowerCase()] = map[key];
  });
  return result;
}

/**
 * Disguise a `page` with custom `headers`.
 *
 * @param {Page} page
 * @param {Object} headers
 */

function disguise (page, headers) {
  var lowercased = lowercase(headers);
  var userAgent = lowercased['user-agent'];
  if (userAgent) page.set('settings.userAgent', userAgent);
  page.set('customHeaders', lowercased);
}

/**
 * Waits until page's document.readyState === complete.
 *
 * @param {Page} page
 * @param {Object} options
 *   @param {Number} checkEvery
 *   @param {Number} after
 * @param {Function} callback
 */

function waitForReady (page, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = defaults(options, {
    checkEvery: 500, // to retry document.readyState
    after: 1000 // wait for javascript/ajax
  });

  debug('waiting for page document.readyState === complete ..');
  page.evaluate(
    function () { return document.readyState; },
    function (err, result) {
      if (err) return callback(err);
      debug('page is document ready, waiting for javascript/ajax timeout ..');
      if (result === 'complete') {
        return setTimeout(function () {
          debug('page is "ready"');
          return callback();
        }, options.after);
      }
      else {
        setTimeout(function () {
          waitForReady(page, callback);
        }, options.checkEvery);
      }
    }
  );
}

/**
 * Get the `page`s html.
 *
 * @param {Page} page
 * @param {Function} callback
 */

function getPageHtml (page, callback) {
  debug('getting page html ..');
  page.evaluate(
    function () {
      return '<html>' + document.head.outerHTML +
      document.body.outerHTML + '</html>';
    },
    function (err, html) {
      html = html || '<html></html>';
      debug('got page html: %d chars', html.length);
      return callback(err, html);
    }
  );
}

/**
 * Add a Phantom standard error handler for silence.
 * https://github.com/ivolo/scraper/issues/2
 *
 * @param {String} message
 */

/*
phantom.stderrHandler = function (message) {
 if(message.match(/(No such method.*socketSentData)|(CoreText performance note)|(WARNING: Method userSpaceScaleFactor in class NSView is deprecated on 10.7 and later.)/)) return;
 console.error(message);
};
*/
