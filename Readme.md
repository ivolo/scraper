
# scraper

  A simpler API for [node-phantom](https://github.com/sgentle/phantomjs-node) web scraping.

## Installation

    $ npm install ivolo/scraper

## Example

### Create a Scraper

```js
var Scraper = require('scraper');

Scraper(function (err, scraper) {
  // creates a `Scraper` plantom instance on a random port
});
```

### Open a Page

```js
scraper.page(function (err, page) {
  // open a page with disguised headers ..
  page.close();
});
```

### Open a Ready Page

```js
scraper.readyPage(url, function (err, page) {
  // do something with the page
  page.close();
});
```

### Get a Ready Page's HTML

```js
scraper.html(url, function (err, page, html) {
  // do something with the html
  page.close();
});
```

## API

### Command Line

```
Usage: scrape url

Options:

  -h, --help     output usage information
  -v, --version  output the version number
  -e, --eval     evaluate the code

Examples:

  # print out html
  $ scrape https://google.com

  # evalute javascript
  $ scrape https://google.com "document.title"

```

```
$ scrape https://google.com "document.title"
'Google'
```

### Node.JS

### Scraper([options], callback)

  Creates a Scraper instance, with defaulted `options`:

```
{
  port: 12300 + Math.floor(Math.random() * 10000), // defaults to a random port
  flags: ['--load-images=no'],
  headers: { // disguise headers
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.71 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language' :'en-US,en;q=0.8',
    'cache-control' :'max-age=0'
  }
}
```

### Scraper

  A `Scraper` instance is returned by the `Scraper(callback)` method.

#### Scraper.phantom

  Get the phantom `instance`. An example to clear the cookies using the original node-phantom API:

```js
var Scraper = require('scraper');

Scraper(function (err, scraper) {
  scraper.phantom.clearCookies(function (err) {
    // cookies cleared
  });
});
```

#### Scraper.page([options], callback)

  Open a page using the disguised headers, with defaulted `options`: 

```js
{
  headers: { .. }
}
```

#### Scraper.readyPage(url, [options], callback)

  Open a page using the disguised headers, load the page at the `url`, and wait for `document.readyState === 'complete'` before returning the page. Uses defaulted `options`: 

```js
{
  checkEvery: 500, // checks document.readyState every so many ms until its ready
  after: 1000, // will wait this many ms after document.readyState to let javascript alter the page
  headers: { .. }
}
```

#### Scraper.html(url, [options], callback)

  Open a ready page at `url`, and return the html. Uses same `options` defaults as `Scraper.readyPage`.


## License

```
WWWWWW||WWWWWW
 W W W||W W W
      ||
    ( OO )__________
     /  |           \
    /o o|    MIT     \
    \___/||_||__||_|| *
         || ||  || ||
        _||_|| _||_||
       (__|__|(__|__|
```
