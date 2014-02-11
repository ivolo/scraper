
var debug = require('debug')('scraper');
var defaults = require('defaults');
var Emitter = require('events').EventEmitter;
var inherit = require('util').inherits;
var phantom = require('phantom');

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
    headers: { // disguise headers
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.71 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language' :'en-US,en;q=0.8',
      'cache-control'   :'max-age=0'
    }
  });

  debug('creating phantom instance at port %d with flags %s ..', options.port, options.flags);
  phantom.create(options.flags, options, function (instance) {
    console.log('create instance with flags: %s', instance.args);
    debug('created phantom instance at port %d', options.port);
    return callback(null, new Scraper(instance, options));
  });
}

/**
 * Create a new `Scraper` instance.
 *
 * @param {Phantom} phantom
 */

function Scraper (phantom, options) {
  if (!(this instanceof Scraper)) return new Scraper(phantom, options);
  this.phantom = phantom;
  this.options = options;
}

/**
 * Inherit from `Emitter`.
 */

inherit(Scraper, Emitter);

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

  this.phantom.createPage(function (page) {
    disguise(page, options.headers);
    debug('created disguised phantom page');
    return callback(null, page);
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

  this.page(options, function (err, page) {
    if (err) return callback(err);
    page.open(url, function (status) {
      debug('page %s opened with status %s', url, status);
      if (status !== 'success') {
        return callback(new Error('Opening page' + url +
          'resulted in status ' + status));
      }

      waitForReady(page, function (err) {
        return callback(err, page);
      });
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
    function (result) {
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
    function (html) {
      debug('got page html: %d chars', html.length);
      return callback(null, html);
    }
  );
}

/**
 * Add a Phantom standard error handler for silence.
 * https://github.com/ivolo/scraper/issues/2
 *
 * @param {String} message
 */

phantom.stderrHandler = function (message) {
 if(message.match(/(No such method.*socketSentData)|(CoreText performance note)|(WARNING: Method userSpaceScaleFactor in class NSView is deprecated on 10.7 and later.)/)) return;
 console.error(message);
};
