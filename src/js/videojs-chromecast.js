import videojs from 'video.js';
import chromecastButton from './component/control-bar/chromecast-button';
import chromecastTech from './tech/chromecast';

const plugin = function (options) {
  if (typeof chrome == 'undefined') return;

  var retries = 0,
      player  = this;

  player.on('loadeddata', function() {
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

videojs.plugin('chromecast', plugin);
