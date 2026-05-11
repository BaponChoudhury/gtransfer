// Dev-only early diagnostic: patches JSON.parse + fetch to catch HTML-as-JSON errors
// This file is served from /debug-monitor.js and loaded via <Script beforeInteractive>
if (typeof window !== 'undefined') {
  var _origParse = JSON.parse;
  JSON.parse = function(text) {
    if (typeof text === 'string' && text.trimStart().charAt(0) === '<') {
      console.error(
        '[DebugMonitor] JSON.parse() called with HTML!\n' +
        'Preview: ' + text.slice(0, 500) + '\n' +
        'Stack:\n' + new Error().stack
      );
    }
    return _origParse.apply(this, arguments);
  };

  var _origFetch = window.fetch;
  window.fetch = function() {
    var args = arguments;
    return _origFetch.apply(this, args).then(function(res) {
      var ct = res.headers.get('content-type') || '';
      if (ct.indexOf('text/html') !== -1) {
        var url = typeof args[0] === 'string' ? args[0]
          : (args[0] && args[0].url) ? args[0].url
          : String(args[0]);
        console.error(
          '[DebugMonitor] fetch() returned HTML!\n' +
          '  URL: ' + url + '\n' +
          '  Status: ' + res.status + '\n' +
          '  Content-Type: ' + ct + '\n' +
          '  Stack:\n' + new Error().stack
        );
      }
      return res;
    });
  };
  console.warn('[DebugMonitor] ✅ Loaded — JSON.parse and fetch are now monitored');
}
