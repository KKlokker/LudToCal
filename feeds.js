var feeds = {};

feeds.SETTINGS_API_URL_ = 'https://www.googleapis.com/calendar/v3/users/me/settings';

feeds.CALENDAR_LIST_API_URL_ = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';

feeds.CALENDAR_EVENTS_API_URL_ =
    'https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?';

feeds.DAYS_IN_AGENDA_ = 16;

feeds.MAX_DAYS_IN_AGENDA_ = 31;

feeds.events = [];

feeds.nextEvents = [];

feeds.lastFetchedAt = null;

feeds.requestInteractiveAuthToken = function() {
  chrome.identity.getAuthToken({'interactive': true}, function(accessToken) {
    feeds.fetchCalendars();
  });
};

feeds.fetchCalendars = function() {

  chrome.storage.local.get('calendars', function(storage) {

    var storedCalendars = storage['calendars'] || {};
    chrome.identity.getAuthToken({'interactive': false}, function(authToken) {

      $.ajax(feeds.CALENDAR_LIST_API_URL_, {
        headers: {'Authorization': 'Bearer ' + authToken},
        success: function(data) {
          var calendars = {};
          for (var i = 0; i < data.items.length; i++) {
            var calendar = data.items[i];
            var serverCalendarID = calendar.id;
            var storedCalendar = storedCalendars[serverCalendarID] || {};

            var visible = (typeof storedCalendar.visible !== 'undefined') ? storedCalendar.visible :
                                                                            calendar.selected;

            var mergedCalendar = {
              id: serverCalendarID,
              title: calendar.summary,
              editable: calendar.accessRole == 'writer' || calendar.accessRole == 'owner',
              description: calendar.description || '',
              foregroundColor: calendar.foregroundColor,
              backgroundColor: calendar.backgroundColor,
              visible: visible
            };

            calendars[serverCalendarID] = mergedCalendar;
          }

          var store = {};
          store['calendars'] = calendars;
          chrome.storage.local.set(store, function() {
            if (chrome.runtime.lastError) {
              return;
            }
            feeds.fetchEvents();
          });
        },
        error: function(response) {
          if (response.status === 401) {
            chrome.identity.removeCachedAuthToken({'token': authToken}, function() {});
          }
        }
      });
    });
  });
};
