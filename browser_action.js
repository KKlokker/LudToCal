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
          for (var iq = 0; iq < data.items.length; iq++) {
            var calendar = data.items[iq];

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

var browseraction = {};

browseraction.QUICK_ADD_API_URL_ = 'https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/quickAdd';

browseraction.TOAST_FADE_OUT_DURATION_MS = 5000;

browseraction.SHOW_EVENTS_DELAY_MS = 100;

browseraction.initialize = function() {
  $('#quick-add').slideDown(200);
  var teste = "" + new Date().getFullYear();
  document.getElementById("Year-Section").value = teste;
  browseraction.installButtonClickHandlers_();
  browseraction.showLoginMessageIfNotAuthenticated_();
  browseraction.loadCalendarsIntoQuickAdd_();
  browseraction.listenForRequests_();
  chrome.extension.sendMessage({method: 'events.feed.get'}, browseraction.showEventsFromFeed_);
};

/** @private */
browseraction.loadCalendarsIntoQuickAdd_ = function() {
  chrome.storage.local.get('calendars', function(storage) {

    if (storage['calendars']) {
      var calendars = storage['calendars'];
      var dropDown = $('#quick-add-calendar-list');
      for (var calendarId in calendars) {
        var calendar = calendars[calendarId];
        if (calendar.editable && calendar.visible) {
          dropDown.append($('<option>', {value: calendar.id, text: calendar.title}));
        }
      }
    }
  });
};

browseraction.loadCalendarsIntoQuickAdd_ = function() {
  chrome.storage.local.get('calendars', function(storage) {

    if (storage['calendars']) {
      var calendars = storage['calendars'];
      var dropDown = $('#quick-add-calendar-list');
      for (var calendarId in calendars) {
        var calendar = calendars[calendarId];
        if (calendar.editable && calendar.visible) {
          dropDown.append($('<option>', {value: calendar.id, text: calendar.title}));
        }
      }
    }
  });
};

browseraction.installButtonClickHandlers_ = function() {
  $('#authorization_required').on('click', function() {
    $('#authorization_required').text(chrome.i18n.getMessage('authorization_in_progress'));
    chrome.extension.sendMessage({method: 'authtoken.update'});
  });

  $('#show_quick_add').on('click', function() {
    browseraction.toggleQuickAddBoxVisibility_(!$('#quick-add').is(':visible'));
  });

  $('#sync_now').on('click', function() {
    chrome.extension.sendMessage({method: 'events.feed.fetch'}, browseraction.showEventsFromFeed_);
  });

  $('#show_options').on('click', function() {
    chrome.tabs.create({'url': 'options.html'});
  });

  $('#quick_add_button').on('click', function() {
    browseraction.addNewEventIntoCalendar_();
  });

  
  $('#login-button').on('click', function() {
    feeds.requestInteractiveAuthToken();
    browseraction.loadCalendarsIntoQuickAdd_();
  });
};

browseraction.toggleQuickAddBoxVisibility_ = function(shouldShow) {
  if (shouldShow) {
    $('#show_quick_add').addClass('rotated');
    $('#quick-add').slideDown(200);
  } else {
    $('#show_quick_add').removeClass('rotated');
    $('#quick-add').slideUp(200);
  }
};

browseraction.addNewEventIntoCalendar_ = function() {
  i = 0;
  InnerTextFunction();
  InnerHTMLFunction();
};

browseraction.showLoginMessageIfNotAuthenticated_ = function() {
  chrome.identity.getAuthToken({'interactive': false}, function(authToken) {
    if (chrome.runtime.lastError || !authToken) {
      $('#error').show();
      $('#action-bar').hide();
      $('#calendar-events').hide();
    } else {
      $('#error').hide();
      $('#action-bar').show();
      $('#calendar-events').show();
    }
  });
};


browseraction.listenForRequests_ = function() {
  chrome.extension.onMessage.addListener(function(request, sender, opt_callback) {
    switch (request.method) {
      case 'ui.refresh':
        chrome.extension.sendMessage(
            {method: 'events.feed.get'}, browseraction.showEventsFromFeed_);
        break;

    }
  });
};

function showToast(parent, summary, linkUrl) {
  var toastDiv = $('<div>').addClass('alert-new-event event').attr('data-url', linkUrl);
  var toastDetails = $('<div>').addClass('event-details');
  var toastText = $('<div>')
                      .addClass('event-title')
                      .css('white-space', 'normal')
                      .text(chrome.i18n.getMessage('alert_new_event_added') + summary);

  toastDetails.append(toastText);
  toastDiv.append(toastDetails);

  parent.prepend(toastDiv).fadeIn();

  $('.alert-new-event').on('click', function() {
    chrome.tabs.create({'url': $(this).attr('data-url')});
  });

  return setTimeout(function() {
    $('.alert-new-event').fadeOut();
    $('.fab').fadeIn();
  }, browseraction.TOAST_FADE_OUT_DURATION_MS);
}

var LastLineCheck;


chrome.runtime.onMessage.addListener(function(request, sender) {
  if (request.action == "getSource") { 
    HTMLText = request.source;

    LastLineCheck = HTMLText.length-1;
    var NewLineCounter = 0;
    while (NewLineCounter != 2){
      if (HTMLText[LastLineCheck] == "\n"){
        NewLineCounter += 1;
      }
      LastLineCheck -= 1;
    }
  }
  else if (request.action == "getSourceHTML"){
    HTMLFull = request.source;
    LudusMagic();
  }
});

function InnerTextFunction() {

  chrome.tabs.executeScript(null, {
    file: "getPagesSource.js"
  }, function() {
  });

}

function InnerHTMLFunction() {

  chrome.tabs.executeScript(null, {
    file: "getPagesSourceHTML.js"
  }, function() {
    if (chrome.runtime.lastError) {
      alert("Sikre dig du er inde på Ludus");
    }
  });

}


var Mandag = "";
var Tirsdag = "";
var Onsdag = "";
var Torsdag = "";
var Fredag = "";
var Months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


var Title = "";
var Time = "";
var Place = "";
var date = "";
var year = "" + new Date().getFullYear();



var TitleFound = false;
var HTMLText;
var HTMLFull;
var WordString = "";
var CurrentString = "";
var FinalEvent = false;

var i = 0;

var CollonsLastLine = 0;
var CollonCounter = 0;
var h = 0;


function LudusDato(){
  
  //Finder Dato
  for(var iw = 0; iw < HTMLText.length ; iw++){
    if(HTMLText[iw] == " " || HTMLText[iw] == "\n"){
        if (CurrentString == "Mandag"){
          var counter2 = 0;
          while (HTMLText[iw+counter2] != '\n') {
            Mandag += HTMLText[iw+counter2];
            counter2 += 1;
          }
          Mandag += "/" + year;
          iw += counter2;
        }
        if (CurrentString == "Tirsdag"){
          var counter2 = 0;
          while (HTMLText[iw+counter2] != '\n') {
            Tirsdag += HTMLText[iw+counter2];
            counter2 += 1;
          }
          Tirsdag += "/" + year;
          iw += counter2;
        }
        if (CurrentString == "Onsdag"){
          var counter2 = 0;
          while (HTMLText[iw+counter2] != '\n') {
            Onsdag += HTMLText[iw+counter2];
            counter2 += 1;
          }
          Onsdag += "/" + year;
          iw += counter2;
        }
        if (CurrentString == "Torsdag"){
          var counter2 = 0;
          while (HTMLText[iw+counter2] != '\n') {
            Torsdag += HTMLText[iw+counter2];
            counter2 += 1;
          }
          Torsdag += "/" + year;
          iw += counter2;
        }
        if (CurrentString == "Fredag"){
          var counter2 = 0;
          while (HTMLText[iw+counter2] != '\n') {
            Fredag += HTMLText[iw+counter2];
            counter2 += 1;
          }
          Fredag += "/" + year;
          iw += HTMLText.length;
        }
      CurrentString = "";
    }
    else{
  CurrentString += HTMLText[iw];
}
  }
}

function LudusGetInfo(){
  while (HTMLText[i] != "\n") {
    Title += HTMLText[i];
    i += 1;
  }
  var testTitle = "Gå";
  if (Title.includes(testTitle)){
    alert("Vælg en uge med timer på");
    return;
  }
  i += 1;
  console.log("Title: ", Title);
  while (HTMLText[i] != "\n") {
    if (HTMLText[i] != " "){
    Time += HTMLText[i];}
    i += 1;
    }
    i += 1;
    console.log("Time: ", Time);
    //Check if there is a location and Teacher
    CounterChecker = 0;
    h = 0;
   while (HTMLText[i+h] != ':') {
    if (HTMLText[i+h] == '\n'){
      CounterChecker += 1;     }
    if (i+h > LastLineCheck+2){
      CounterChecker += 1; FinalEvent = true;  break; }
    h += 1;
   }
   CounterChecker -= 1;
   
   var idk = 0;
   var dashTest = false;
   while (idk != CounterChecker) {
     if (i < 200){break;}
     if (false) {
       if (CounterChecker == 2){
         if(idk == 0){
        if (HTMLText[i] == "\n") {
          idk += 1;
       } 
       else {
        Place += HTMLText[i];
      }
     }
     else{
       if (HTMLText[i] == "\n") {
      idk += 1;}
    }}
    else if (CounterChecker == 1){
      if (!dashTest){
        if(HTMLText[i] == "-" || HTMLText[i] == "."){dashTest = true;}
      Place += HTMLText[i];
      }
      else{
        if (HTMLText[i] == "\n") {
          idk += 1;
        }
        else{
      if('0' < HTMLText[i] && '9' > HTMLText[i])
        {Place += HTMLText[i];}
        else{
          if(HTMLText[i] != HTMLText[i].toUpperCase()){Place += HTMLText[i];}
    }}}
    }}
     else{
    if (HTMLText[i] == "\n") {
      idk += 1;
      Place += " ";
    }
    else {
      Place += HTMLText[i];
    }}
    i += 1;
   }
   console.log("Place: ", Place);
  

  //FIND DATE
  var indexE = HTMLFull.indexOf(Title);
  for (var m = indexE; m > 0; m--) {
    if(HTMLFull[m] == ':' && HTMLFull[m-1] == 't' && HTMLFull[m-2] == 'f' && HTMLFull[m-3] == 'e' && HTMLFull[m-4] == 'l' && HTMLFull[m-5] == ' '){
      let dateList = [Mandag, Mandag, Tirsdag, Mandag, Onsdag, Onsdag, Torsdag, Torsdag, Fredag];
      date = dateList[parseInt(HTMLFull[m+2])];
      m = 0;
    }
  }
    
  
  HTMLFull = HTMLFull.slice(indexE+Title.length, HTMLFull.length);
  //date = date.replace(".","/");
  if (date[0] == ' '){
    date = date.substring(1);
  }
  if (date[0] == '0'){
    date = date.substring(1);
  }
  if (date[1]== '.')
  {
    date =year + "-" + date[2]+date[3]+ "-" + date[0];
  }
  else {
  date =year + "-" + date[3]+date[4]+ "-" + date[0]+ date[1] ;}
  console.log(Title + ": " + Place + " " + Time + " " + date);
  var TextSend = Title + ": " + Place + " " + Time + " " + date;
  browseraction.createQuickAddEvent_(TextSend,$('#quick-add-calendar-list').val());
 
  Title = "";
  Time = "";
  Place = "";
  date = "";
  if(i+h > HTMLText.length){ i=HTMLText.length}

}

function LudusFindTitle(){
  if (HTMLText[i] == "\n"){
    if (CollonCounter == 0 && CollonsLastLine == 4){
      TitleFound = true;
      i -= 1;
      while (HTMLText[i] != "\n") {
        i -= 1;
      }
    }
    CollonsLastLine = CollonCounter;
    CollonCounter = 0;
  }
  if (HTMLText[i] == ':') {
  CollonCounter += 1;
}
}

function LudusMagic(){

  LudusDato();
  while( i < HTMLText.length) {
    if(!TitleFound){
      LudusFindTitle();
    }
    else {
      LudusGetInfo();
      break;
    }
    i++;
}}


browseraction.createQuickAddEvent_ = function(text, calendarId) {
  var quickAddUrl =
      browseraction.QUICK_ADD_API_URL_.replace('{calendarId}', encodeURI(calendarId)) +
      '?text=' + encodeURI(text);
  chrome.identity.getAuthToken({'interactive': false}, function(authToken) {

    $.ajax(quickAddUrl, {
      type: 'POST',
      headers: {'Authorization': 'Bearer ' + authToken},
      success: function(response) {
        if (!FinalEvent){
        LudusGetInfo();}
        showToast($('section'), response.summary, response.htmlLink);
        chrome.extension.sendMessage({method: 'events.feed.fetch'});
      },
      error: function(response) {
        i++;
        if (!FinalEvent){
        LudusGetInfo();}
        $('#info_bar').text(chrome.i18n.getMessage('error_saving_new_event')).slideDown();
        window.setTimeout(function() {
          $('#info_bar').slideUp();
        }, 5000);
        if (response.status === 401) {
          chrome.identity.removeCachedAuthToken({'token': authToken}, function() {});
        }
      }
    });
  });
};


window.addEventListener('load', function() {
  browseraction.initialize();
}, false);