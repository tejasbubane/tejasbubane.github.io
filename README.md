# Tejas' Blog

Built using [zola](https://www.getzola.org/) - a superfast static site generator built in [rust](https://www.rust-lang.org/).

### Installation

`Zola` is a standalone binary which can be installed on all major platforms using package managers or from source.
Instructions are [here](https://www.getzola.org/documentation/getting-started/installation/).

### Usage

Run local server using:

```sh
zola serve
```

This will start server on http://localhost:1111

For more usage instructions [refer this](https://www.getzola.org/documentation/getting-started/cli-usage/).

### Theme

Theme used is [even](https://www.getzola.org/themes/even/). Even though `zola` has direct support for this theme, I needed some customizations, so [I ended up forking the main theme](https://github.com/tejasbubane/even/). The customized theme is used as [submodule in this repo](./themes).

Make changes to the theme repo, push and then update submodule from this repo:

```sh
git submodule update --remote
```

### Deploying

After making changes and verifying in browser, just commit and push changes. [Github Actions](./.github/workflows/zola.yml) will build static pages and deploy to [Github pages](https://pages.github.com/) automatically.

**Note:** Work on master branch. CI will commit and push changes on `gh-pages` branch. Repo has github pages [configured](https://docs.github.com/en/github/working-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) with `branch=gh-pages` and `path=root`.
