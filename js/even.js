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
