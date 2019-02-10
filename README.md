# Hakyll Blog

Hosted at: https://tejasbubane.github.io

## Requirements

1. [Stack](https://docs.haskellstack.org/en/stable/README/)
1. [Sass](https://sass-lang.com/install) - for compiling `scss` files. Use dart sass.

## Setup

To install all dependencies including [Hakyll](https://jaspervdj.be/hakyll/).
```
stack install
```

## Usage

#### Development

* Clean existing assets and cache:

```sh
stack exec site clean
```

* Build hakyll DSL haskell code in `site.hs` itself:

```sh
stack build
```

* Keep writing assets to `_site` directory whenever anything is edited (Note this does not run any webserver, just writes to `_site`):

```sh
stack exec site watch
```

* Use [livereload](https://www.npmjs.com/package/livereload) to run webserver to view
  built assets and also livereload the browser when anything changes - superuseful in
  development for quick feedback:

```sh
livereload _site
```

Go to: http://127.0.0.1:35729/


#### Production build

```sh
stack build
stack exec site rebuild
```

This will output all static assets to `_site` directory.
