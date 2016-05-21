'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _videoJs = require('video.js');

var _videoJs2 = _interopRequireDefault(_videoJs);

var _componentControlBarChromecastButton = require('./component/control-bar/chromecast-button');

var _componentControlBarChromecastButton2 = _interopRequireDefault(_componentControlBarChromecastButton);

var _techChromecast = require('./tech/chromecast');

var _techChromecast2 = _interopRequireDefault(_techChromecast);

var plugin = function plugin(options) {
  if (typeof chrome == 'undefined') return;

  var retries = 0,
      player = this;

  player.on('loadeddata', function () {
    var button = player.controlBar.childNameIndex_.chromeCastButton;

    if (!button) {
      button = player.controlBar.addChild('chromeCastButton', options);
      player.controlBar.el().insertBefore(button.el(), player.controlBar.fullscreenToggle.el());
    }

    var interval = setInterval(function () {
      if (chrome.cast && chrome.cast.isAvailable) {
        button.initializeApi();
        clearInterval(interval);
      }

      if (++retries > 5) {
        clearInterval(interval);
      }
    }, 1000);
  });
};

_videoJs2['default'].plugin('chromecast', plugin);