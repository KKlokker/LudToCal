
var background = {};

background.logs_ = [];

/**
 * Initializes the background page by registering listeners.
 */
background.initialize = function() {
  background.initMomentJs_();
  background.listenForRequests_();
};

background.initMomentJs_ = function() {
  moment.lang('relative-formatter', {
    // clang-format off
    relativeTime: {
      future: '%s',
      past: '%s',
      s: '1s',
      ss: '%ds',
      m: '1m',
      mm: '%dm',
      h: '1h',
      hh: '%dh',
      d: '1d',
      dd: '%dd',
      M: '1mo',
      MM: '%dmo',
      y: '1yr',
      yy: '%dy'
    }
  });
};

/**
 * Listens for incoming RPC calls from the browser action and content scripts
 * and takes the appropriate actions.
 * @private
 */
background.listenForRequests_ = function() {
  chrome.extension.onMessage.addListener(function(request, sender, opt_callback) {
    
    // Indicates to Chrome that a pending async request will eventually issue
    // the callback passed to this function.
    return true;
  });
};



background.initialize();
