'use strict';

$(document).ready(function () {
  _even.Even.backToTop();
  _even.Even.mobileNavbar();
  _even.Even.toc();
  _even.Even.fancybox();
});

_even.Even.responsiveTable();
_even.Even.flowchart();
_even.Even.sequence();

if (window.hljs) {
  hljs.initHighlighting();
  _even.Even.highlight();
} else {
  _even.Even.chroma();
}
