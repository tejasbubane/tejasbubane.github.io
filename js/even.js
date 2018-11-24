'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Even = undefined;

var _wordy = require('./wordy.js');

'use strict';

var Even = {};

Even.backToTop = function () {
  var $backToTop = $('#back-to-top');

  $(window).scroll(function () {
    if ($(window).scrollTop() > 100) {
      $backToTop.fadeIn(1000);
    } else {
      $backToTop.fadeOut(1000);
    }
  });

  $backToTop.click(function () {
    $('body,html').animate({ scrollTop: 0 });
  });
};

Even.mobileNavbar = function () {
  var $mobileNav = $('#mobile-navbar');
  var $mobileNavIcon = $('.mobile-navbar-icon');
  var slideout = new Slideout({
    'panel': document.getElementById('mobile-panel'),
    'menu': document.getElementById('mobile-menu'),
    'padding': 180,
    'tolerance': 70
  });
  slideout.disableTouch();

  $mobileNavIcon.click(function () {
    slideout.toggle();
  });

  slideout.on('beforeopen', function () {
    $mobileNav.addClass('fixed-open');
    $mobileNavIcon.addClass('icon-click').removeClass('icon-out');
  });

  slideout.on('beforeclose', function () {
    $mobileNav.removeClass('fixed-open');
    $mobileNavIcon.addClass('icon-out').removeClass('icon-click');
  });

  $('#mobile-panel').on('touchend', function () {
    slideout.isOpen() && $mobileNavIcon.click();
  });
};

Even._initToc = function () {
  var SPACING = 20;
  var $toc = $('.post-toc');
  var $footer = $('.post-footer');

  if ($toc.length) {
    var minScrollTop = $toc.offset().top - SPACING;
    var maxScrollTop = $footer.offset().top - $toc.height() - SPACING;

    var tocState = {
      start: {
        'position': 'absolute',
        'top': minScrollTop
      },
      process: {
        'position': 'fixed',
        'top': SPACING
      },
      end: {
        'position': 'absolute',
        'top': maxScrollTop
      }
    };

    $(window).scroll(function () {
      var scrollTop = $(window).scrollTop();

      if (scrollTop < minScrollTop) {
        $toc.css(tocState.start);
      } else if (scrollTop > maxScrollTop) {
        $toc.css(tocState.end);
      } else {
        $toc.css(tocState.process);
      }
    });
  }

  var HEADERFIX = 30;
  var $toclink = $('.toc-link');
  var $headerlink = $('.headerlink');
  var $tocLinkLis = $('.post-toc-content li');

  var headerlinkTop = $.map($headerlink, function (link) {
    return $(link).offset().top;
  });

  var headerLinksOffsetForSearch = $.map(headerlinkTop, function (offset) {
    return offset - HEADERFIX;
  });

  var searchActiveTocIndex = function searchActiveTocIndex(array, target) {
    for (var i = 0; i < array.length - 1; i++) {
      if (target > array[i] && target <= array[i + 1]) return i;
    }
    if (target > array[array.length - 1]) return array.length - 1;
    return -1;
  };

  $(window).scroll(function () {
    var scrollTop = $(window).scrollTop();
    var activeTocIndex = searchActiveTocIndex(headerLinksOffsetForSearch, scrollTop);

    $($toclink).removeClass('active');
    $($tocLinkLis).removeClass('has-active');

    if (activeTocIndex !== -1) {
      $($toclink[activeTocIndex]).addClass('active');
      var ancestor = $toclink[activeTocIndex].parentNode;
      while (ancestor.tagName !== 'NAV') {
        $(ancestor).addClass('has-active');
        ancestor = ancestor.parentNode.parentNode;
      }
    }
  });
};

Even.fancybox = function () {
  if ($.fancybox) {
    $('.post-content').each(function () {
      $(this).find('img').each(function () {
        $(this).wrap('<a class="fancybox" href="' + this.src + '" data-fancybox="gallery" data-caption="' + this.title + '"></a>');
      });
    });

    $('.fancybox').fancybox({
      selector: '.fancybox',
      protect: true
    });
  }
};

Even.highlight = function () {
  var blocks = document.querySelectorAll('pre code');
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    var rootElement = block.parentElement;
    var lineCodes = block.innerHTML.split(/\n/);
    if (lineCodes[lineCodes.length - 1] === '') lineCodes.pop();
    var lineLength = lineCodes.length;

    var codeLineHtml = '';
    for (var _i = 0; _i < lineLength; _i++) {
      codeLineHtml += '<div class="line">' + (_i + 1) + '</div>';
    }

    var codeHtml = '';
    for (var _i2 = 0; _i2 < lineLength; _i2++) {
      codeHtml += '<div class="line">' + lineCodes[_i2] + '</div>';
    }

    block.className += ' highlight';
    var figure = document.createElement('figure');
    figure.className = block.className;
    figure.innerHTML = '<table><tbody><tr><td class="gutter"><pre>' + codeLineHtml + '</pre></td><td class="code"><pre>' + codeHtml + '</pre></td></tr></tbody></table>';

    rootElement.parentElement.replaceChild(figure, rootElement);
  }
};

Even.chroma = function () {
  var blocks = document.querySelectorAll('.highlight > .chroma');
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    var afterHighLight = block.querySelector('pre.chroma > code');
    var lang = afterHighLight ? afterHighLight.className : '';
    block.className += ' ' + lang;
  }
};

Even.toc = function () {
  var tocContainer = document.getElementById('post-toc');
  if (tocContainer !== null) {
    var toc = document.getElementById('TableOfContents');
    if (toc === null) {
      // toc = true, but there are no headings
      tocContainer.parentNode.removeChild(tocContainer);
    } else {
      this._refactorToc(toc);
      this._linkToc();
      this._initToc();
    }
  }
};

Even._refactorToc = function (toc) {
  // when headings do not start with `h1`
  var oldTocList = toc.children[0];
  var newTocList = oldTocList;
  var temp = void 0;
  while (newTocList.children.length === 1 && (temp = newTocList.children[0].children[0]).tagName === 'UL') {
    newTocList = temp;
  }

  if (newTocList !== oldTocList) toc.replaceChild(newTocList, oldTocList);
};

Even._linkToc = function () {
  var links = document.querySelectorAll('#TableOfContents a:first-child');
  for (var i = 0; i < links.length; i++) {
    links[i].className += ' toc-link';
  }for (var num = 1; num <= 6; num++) {
    var headers = document.querySelectorAll('.post-content>h' + num);
    for (var _i3 = 0; _i3 < headers.length; _i3++) {
      var header = headers[_i3];
      header.innerHTML = '<a href="#' + header.id + '" class="headerlink anchor"><i class="iconfont icon-link"></i></a>' + header.innerHTML;
    }
  }
};

Even.flowchart = function () {
  if (!window.flowchart) return;

  var blocks = document.querySelectorAll('pre code.language-flowchart');
  for (var i = 0; i < blocks.length; i++) {
    if (!window.hljs && i % 2 === 0) continue;

    var block = blocks[i];
    var rootElement = window.hljs ? block.parentElement : block.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;

    var container = document.createElement('div');
    var id = 'js-flowchart-diagrams-' + i;
    container.id = id;
    container.className = 'align-center';
    rootElement.parentElement.replaceChild(container, rootElement);

    var diagram = flowchart.parse(block.childNodes[0].nodeValue);
    diagram.drawSVG(id, window.flowchartDiagramsOptions ? window.flowchartDiagramsOptions : {});
  }
};

Even.sequence = function () {
  if (!window.Diagram) return;

  var blocks = document.querySelectorAll('pre code.language-sequence');
  for (var i = 0; i < blocks.length; i++) {
    if (!window.hljs && i % 2 === 0) continue;

    var block = blocks[i];
    var rootElement = window.hljs ? block.parentElement : block.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;

    var container = document.createElement('div');
    var id = 'js-sequence-diagrams-' + i;
    container.id = id;
    container.className = 'align-center';
    rootElement.parentElement.replaceChild(container, rootElement);

    var diagram = Diagram.parse(block.childNodes[0].nodeValue);
    diagram.drawSVG(id, window.sequenceDiagramsOptions ? window.sequenceDiagramsOptions : { theme: 'simple' });
  }
};

Even.responsiveTable = function () {
  var tables = document.querySelectorAll('.post-content > table');
  for (var i = 0; i < tables.length; i++) {
    var table = tables[i];
    var wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    table.parentElement.replaceChild(wrapper, table);
    wrapper.appendChild(table);
  }
};

exports.Even = Even;
