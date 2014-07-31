
var assert = require('assert');
var Scraper = require('..');

describe('scraper', function () {
  this.timeout(5000); // booting up phantom can take a second

  it('should be able to create a new phantom instance', function (done) {
    Scraper(function (err, scraper) {
      if (err) return done(err);
      assert(scraper);
      assert(scraper.phantomArgs);
      done();
    });
  });

  it('should be able to open a page', function (done) {
    Scraper(function (err, scraper) {
      if (err) return done(err);
      scraper.page(function (err, page) {
        if (err) return done(err);
        page.close();
        done();
      });
    });
  });

  it('should be able to open a ready page', function (done) {
    Scraper(function (err, scraper) {
      if (err) return done(err);
      scraper.page(function (err, page) {
        if (err) return done(err);
        assert(page);
        page.close();
        done();
      });
    });
  });

  it('should be able to open a ready page for google', function (done) {
    this.timeout(30000); // need to wait extra for page ready
    Scraper(function (err, scraper) {
      if (err) return done(err);
      scraper.readyPage('https://google.com', function (err, page) {
        if (err) return done(err);
        assert(page);
        page.close();
        done();
      });
    });
  });

  it('should be able to open a ready page with redirect', function (done) {
    this.timeout(30000); // need to wait extra for page ready
    Scraper(function (err, scraper) {
      if (err) return done(err);
      scraper.readyPage('http://de.linkedin.com/pub/marlene-dittrich-lux/33/aa4/542', function (err, page) {
        if (err) return done(err);
        assert(page);
        page.close();
        done();
      });
    });
  });

  it('should be able to get a pages html', function (done) {
    this.timeout(30000); // need to wait extra for page ready
    Scraper(function (err, scraper) {
      if (err) return done(err);
      scraper.html('https://bing.com', function (err, page, html) {
        if (err) return done(err);
        assert(page);
        page.close();
        assert(html);
        assert(html.length > 0);
        done();
      });
    });
  });

  it.only('should be able to get a pages html for awocado.fi and recover from crash', function (done) {
    this.timeout(90000); // need to wait extra for page ready
    Scraper(function (err, scraper) {
      if (err) return done(err);
      scraper.html('http://www.awocado.fi', function (err, page, html) {
        assert(!!err);
        // should recover
        scraper.html('https://bing.com', function(err, page, html) {
          if (err) return done(err);
          assert(page);
          page.close();
          assert(html);
          assert(html.length > 0);
          done();
        });
      });
    });
  });

  // useful for testing against local server to verify headers, etc.
  it.skip('Test headers', function (done) {
    this.timeout(30000); // need to wait extra for page ready
    Scraper(function (err, scraper) {
      if (err) return done(err);
      scraper.html('http://localhost:3000', function (err, page, html) {
        if (err) return done(err);
        assert(page);
        page.close();
        assert(html);
        assert(html.length > 0);
        done();
      });
    });
  });
});
