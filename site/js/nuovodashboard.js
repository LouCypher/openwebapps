/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Nuovo Dashboard, nuovodashboard.js
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Dan Walkowski <dwalkowski@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// Singleton instance of the Apps object:
var gApps = {};

//the list filter string
var gFilterString = "";

var gDashboardState = {};
gDashboardState.appsInDock = [];
gDashboardState.widgetPositions = {};



var gOverDock = false;

function saveDashboardState( callback ) {
  navigator.apps.mgmt.saveState(gDashboardState, callback);
}


//giant pain:  we have only one unique identifying piece of data per app, and it's a url.
// urls cannot be used for css/dom ids, as they contain disallowed characters.
// we must construct a 1-1 mapping unique string that only contains allowed characters.
// I have chose base32, in particular Crockford's version.  It is found in js/base32.js

function findInstallForID(origin32) {
  return gApps[decode(origin32)];
  return null;
}


function getWindowHeight() {
  if(window.innerHeight) return window.innerHeight;
  if (document.body.clientHeight) return document.body.clientHeight;
}

function resizeAppList() {
  var listPos = $("#list").position();
  $("#list").height(getWindowHeight() - (listPos.top + 16));
}

function resizeWidgetArea() {
  var widgePos = $("#widgets").position();
  $("#widgets").height(getWindowHeight() - (widgePos.top + 16));
}


window.onload = function() {
  resizeAppList();
  resizeWidgetArea();
}

window.onresize = function() {
  resizeAppList();
  resizeWidgetArea();
}


function filterAppList(event) {
    //get the current contents of the text field, and only show the ones in the list that match
    gFilterString = $("#filter").val().toLowerCase();
    renderList();
  };

function computeSlot(event) {
      //determine what slot they are over
      var appCount =  $("#dock").children().length;
      var newAppSlot = Math.floor((event.pageX - 20) / 80);
      if (newAppSlot > (appCount -1)) { newAppSlot = appCount; }
      return newAppSlot;
}
  
function displayPlaceholder(event) {
        if (!gOverDock) { return; };
        removePlaceholder();
        var slot = computeSlot(event);
        //insert a placeholder
        var dockIcons = $("#dock").children();

        //shortcut
        if (slot >= dockIcons.length) {
          $("#dock").append($("<div/>").addClass("appInDockDrop glowy-blue-outline"));
          return;
        }

        for (var i=0; i<dockIcons.length; i++)
        {
          var currApp = dockIcons[i];
          $(currApp).detach();
          if (i == slot) { $("#dock").append($("<div/>").addClass("appInDockDrop glowy-blue-outline")) };
          if ($(dockIcons[i]).hasClass("appInDock")) { $("#dock").append(dockIcons[i]) };
        }
}

function removePlaceholder( ) {
    $("#dock > .appInDockDrop").remove();
}



function dragOver(event, ui) { gOverDock = true; };


function dragOut(event, ui) { gOverDock = false;
                              removePlaceholder();
                              };



function insertAppInDock(newApp, event) {
    var newAppSlot = computeSlot(event);
    gDashboardState.appsInDock.splice(newAppSlot, 0, newApp.attr("id"));
    saveDashboardState();
    updateDock();
};


//called when an app is deleted, so we don't build up cruft in the dock list
function removeAppFromDock(removedOrigin32) {
    var newDockList = [];
    var curApp;
    for ( var i = 0; i < gDashboardState.appsInDock.length; i++ ) {
          curApp = gDashboardState.appsInDock[i];
          
          //clean out this app, and also any other cruft we find
          if ( (removedOrigin32 != curApp)  && ( findInstallForID(curApp)  ) ) {
             newDockList.push[curApp];          
           };
    };
    gDashboardState.appsInDock = newDockList;
};


function buttonHot() {
  $(this).addClass("hot");
};

function buttonCold() {
  $(this).removeClass("hot");
};

function infoHot() {
  $(this).addClass("infohot");
}

function infoCold() {
  $(this).removeClass("infohot");
}

//************** document.ready()

$(document).ready(function() {
    //temporarily set the repository origin to localhost
   // navigator.apps.setRepoOrigin("..");

    $("#dock").droppable({ accept: ".dockItem", over: dragOver, out: dragOut,  
                        drop: function(event, ui) {
                          gOverDock = false;
                          removePlaceholder();
                          var newAppInDock = createDockItem(ui.draggable.context.id);
                          insertAppInDock(newAppInDock, event);
                        }
                   });
 
 
  $("#clearButton").click( function() { gFilterString = ""; $("#filter").attr("value", gFilterString); renderList(); });
  $("#clearButton").mouseenter(buttonHot).mouseleave(buttonCold);
  
  // can this user use myapps?
   var w = window;
   if (w.JSON && w.postMessage) {
       try {
                gFilterString = $("#filter").val().toLowerCase();
                updateDashboard();
                
            } catch (e) {
            
                 if (typeof console !== "undefined") console.log(e);
            }

   } else {
       $("#unsupportedBrowser").fadeIn(500);
   }
});


function checkSavedData(save) {
  //do a basic structure check on our saved data
  var emptyState = {};
  emptyState.appsInDock = [];
  emptyState.widgetPositions = {};

  if (save && ($.isPlainObject(save))) {
    if (save.appsInDock && $.isArray(save.appsInDock) && save.widgetPositions && $.isPlainObject(save.widgetPositions)) return save;
  }
  return emptyState;
}



//this is the primary UI function.  It loads the latest app list from disk, the latest dashboard state from disk,
// and then proceeds to bring the visual depiction into synchrony with the data, with the least visual interruption.
function updateDashboard( completionCallback ) {
    //both the app list and dashboard data functions are asynchronous, so we need to do everything in the cal
      navigator.apps.mgmt.list( function (listOfInstalledApps) {
          
          gApps = listOfInstalledApps;

          //now, in the list callback, load the dashboard state
          navigator.apps.mgmt.loadState( function (dashState) {
              gDashboardState = checkSavedData(dashState);
              
              //now, in the loadState callback, update everything.
              //I'm rebuilding the entire app list and dock list for now, since it is likely not the bottleneck. they can be updated later, if they become a performance problem
              // I -am- carefully adding/removing widgets only where necessary, as it is quite expensive, since they contain iframes.
              renderList();
              updateDock();
              updateWidgets();
  
              //and call the dream within a dream within a dream callback.  if it exists.
              if (completionCallback) { completionCallback(); };
           });                      
      });
}



// launch the app into a tab.  we'd like it to just switch to it if it already exists. I think that needs to be handled in launch()
function makeOpenAppTabFn(origin32)
{
  try {
    return function(evt) {
         if ($(this).hasClass("ui-draggable-dragged")) {
             $(this).removeClass("ui-draggable-dragged");
             return false;
         }
        if (typeof console !== "undefined") console.log("trying to launch: " + decode(origin32));
        navigator.apps.mgmt.launch(decode(origin32));
    }
  } catch (e) {
      if (typeof console !== "undefined") console.log("error launching: " + e);
  }
}

//create the full app list, and sort them for display
// here is also where I cache the base32 version of the origin into the app
function renderList() {
  if (!gApps) return;
  var appList = $("#list");
  $('.app').remove();
  
  for (origin in gApps) {
    try {
      var install = gApps[origin];
      
      //BASE32 ENCODE HERE ONLY
      if ( ! install.origin32) { install.origin32 = encode(install.origin); };
      
      //TO DO: need to sort these
      if (gFilterString.length == 0 || gFilterString == install.manifest.name.substr(0,gFilterString.length).toLowerCase() ) {
        var icon = createAppListItem(install);
        //check for no icon here, and supply a default one
        appList.append(icon);
      }
    } catch (e) {
      if (typeof console !== "undefined") console.log("Error while creating list icon for app " + i + ": " + e);
    }
  }
}



//reloading the widgets is very expensive, so we only want to fix up the widgets, not reload them all
function updateWidgets( )  {
      
        //if we have no apps, bail out
        if (!gApps) return;

        var widgetSpace = $("#widgets");
        
        //first, walk the list of apps, adding/removing any widgets that should be displayed, but aren't currently (enabled button was toggled, app was added, etc.)
        for (app in gApps) {
            try {
              //does the app specify a widget?  if so, check to see if we already have one
              if (gApps[app].manifest && gApps[app].manifest.widget) {      
                  var existingWidget = widgetSpace.children( "#" + gApps[app].origin32 );
                  
                  if (existingWidget[0]) {
                      //if we already have a widget, but its enabled flag is set to 'NO', then delete it, and continue to next install
                      if (gDashboardState.widgetPositions[gApps[app].origin32].disabled) {
                        $(" #widgets > #" + gApps[app].origin32).remove();
                      }
                  } else {
                      //if we don't have a widget, and its enable flag is set to 'YES' (or no dashboard state), then create it, create the dashboard state for it, and continue to next install
                      
                      //if it has no dashboard state, give it a default one
                        if (!gDashboardState.widgetPositions[gApps[app].origin32])  {
                            //make a new one, and put it in the save state.  NOTE: we add some padding for the frame, but only when we create and save
                            // the widget the first time.  from then on, we use the outer frame as the thing to measure the size of
                            gDashboardState.widgetPositions[gApps[app].origin32] = {"top": 0,
                                                                            "left": 0, 
                                                                            "height": ((gApps[app].manifest.widget.height ? gApps[app].manifest.widget.height : 120) + 16),
                                                                            "width": ((gApps[app].manifest.widget.width ? gApps[app].manifest.widget.width : 200) + 16),
                                                                            "zIndex" : 0
                                                                             };
                            //save state, since we added something
                            saveDashboardState();
                      }
                      
                      if (gDashboardState.widgetPositions[gApps[app].origin32].disabled) { return; }


                      //NOTE: this takes the size of the outer widget frame, so pad it the first time if you want some specific content size
                       var widgetPos = gDashboardState.widgetPositions[gApps[app].origin32];
                       var widget = createWidget(gApps[app], widgetPos.top, widgetPos.left, widgetPos.height, widgetPos.width, widgetPos.zIndex);  
                       widgetSpace.append(widget);

                  }

              }
              else {
                  if (typeof console !== "undefined") console.log("no widget defined for app : " + gApps[app].manifest.name);
              }
              
          } catch (e) {
              if (typeof console !== "undefined") console.log("Error while creating widget for app : " + e);
          }
        };
          
      //then, walk the list of widgets, and remove any that belong to apps that have been deleted
      
      $("#widgets > .widgetFrame").each( function() {
          var app = findInstallForID(this.id);  //the dom element id contains the origin32 of the app it belongs to

          if (!app) {
              //delete the widget
              $(" #widgets > #" + this.id).remove();
          } else {
              //update the widget position
              var wPos = gDashboardState.widgetPositions[this.id];
               $(this).css({"zIndex": wPos.zIndex});  //can'tbe animated
               $(this).animate( {"top": wPos.top + "px",
                                  "left": wPos.left + "px", 
                                  "height": wPos.height + 16 + "px", 
                                  "width": wPos.width + 16 + "px"
                                  } );
                          
              var selectorString = "#" + this.id + "client, #" + this.id + "hider";
              $(this).children(selectorString).animate({"height": wPos.height, "width": wPos.width});
          };
      
      });
      
}




function updateDock()
{
  if (!gApps) return;

  $('.appInDock').remove();
  var newDockList = [];
  
  for ( var i = 0; i < gDashboardState.appsInDock.length; i++ ) {
    try {
        var origin32 = gDashboardState.appsInDock[i];
        var dockItem = createDockItem(origin32);
        
        if ( ! dockItem ) { 
            //cruft left in array.  should have been cleaned up
            if (typeof console !== "undefined") console.log("no app found for dock item with origin:  " + decode(origin32));
            continue; 
        };
        
        $("#dock").append(dockItem);
    } catch (e) {
      if (typeof console !== "undefined") console.log("Error while creating dock icon for app " + i + ": " + e);
    }
  }
}



function getBigIcon(manifest) {
  //see if the manifest has any icons, and if so, return a 64px one if possible
  if (manifest.icons) {
  //prefer 64
    if (manifest.icons["64"]) return manifest.icons["64"];
    
    var bigSize = 0;
    for (z in manifest.icons) {
      var size = parseInt(z, 10);
      if (size > bigSize) bigSize = size;
    }
    if (bigSize !== 0) return manifest.icons[bigSize];
  }
  return null;
}



function getSmallIcon(manifest) {
  //see if the manifest has any icons, and if so, return a 32px one if possible
  if (manifest.icons) {
  //prefer 32
    if (manifest.icons["32"]) return manifest.icons["32"];
    
    var smallSize = 1000;
    for (z in manifest.icons) {
      var size = parseInt(z, 10);
      if (size < smallSize) smallSize = size;
    }
    if (smallSize !== 1000) return manifest.icons[smallSize];
  }
  return null;
}


function showAppInfo(origin32) {
  //gray out the screen, put up a modal dialog with the application info.
  //  items in the dialog:
  //  * app info, with links to origin, etc.
  //  * delete button
  //  * widget enable button
  //  * thingie to dismiss the dialog
  
  $("#appinfo").append(createAppInfoPane(origin32));
  revealModal("modalPage");
}

function createAppListItem(install)
{
  var appContainer = $("<div/>").addClass("app dockItem");
  appContainer.attr("id", install.origin32);
  
  //the info button
  var infoButton = $("<img/>").addClass("glowButton");
  infoButton.attr("src", "img/appinfo.png");
  infoButton.attr("id", install.origin32);
  appContainer.append(infoButton);
  
  infoButton.click( function() {showAppInfo(install.origin32); });
  infoButton.mouseenter(infoHot).mouseleave(infoCold);


  var clickyIcon = $("<div/>").addClass("icon");
  var iconImg = getSmallIcon(install.manifest);


//this clips properly in  FF 3.6 , but not in 4
    clickyIcon.css({
    "background-image": "url(\"" + install.origin + iconImg + "\")",
    "-moz-background-size": 32
    });

  appContainer.append(clickyIcon);

  var appName = $("<div/>").addClass("listLabel glowy-blue-text");
  appName.text(install.manifest.name);  
  appName.disableSelection();
  
  appName.click(makeOpenAppTabFn(install.origin32));

  appContainer.append(appName);

  //TO DO: make a large icon helper here, instead of using the image of the list item.  it needs to look like a dock item.
  appContainer.draggable({revert : "invalid", 
                          zIndex: 1000,
                          helper : "clone", 
                          opacity: "0.5",
                          stop: function(event, ui) {
                            appContainer.addClass("ui-draggable-dragged");
                          },
                          
                          drag: function(event) { 
                                                  displayPlaceholder(event); 
                                                }

                          });
                        

  return appContainer;
}


function createDockItem(origin32, existingDiv)  //if you pass in an existing div, it will fill it instead of making a new one
{
  var installRecord = findInstallForID(origin32);
  if (!installRecord) return null;
  
  var dockContainer = existingDiv ? existingDiv : $("<div/>");
  dockContainer.removeClass("app");
  dockContainer.removeClass("ui-draggable");
  dockContainer.addClass("appInDock dockItem");
  dockContainer.attr("id", origin32);
  
  var clickyIcon = $("<div/>").addClass("dockIcon");
  var iconImg = getBigIcon(installRecord.manifest);
  
//this clips the image properly in FF 3.6, but not in 4
  clickyIcon.css({
    "background-image": "url(\"" + installRecord.origin + iconImg + "\")",
    "-moz-background-size": 64
    });

  dockContainer.click(makeOpenAppTabFn(origin32));
  dockContainer.append(clickyIcon);
  
  dockContainer.draggable({ 
                          zIndex: 1000,
                          helper : "clone", 
                          opacity: "0.5",
                          start: function(event, ui) { 
                                var which = computeSlot(event);
                                gDashboardState.appsInDock.splice(which, 1);
                                $(this).detach();
                          },
                          
                          stop: function(event, ui) {
                              saveDashboardState();
                              dockContainer.addClass("ui-draggable-dragged");
                          },
                          
                          drag: function(event) { 
                                                  displayPlaceholder(event); 
                                                }

                          });

  return dockContainer;
}

function restackWidgets(widget) {
        var highest = 0;
        $.each( gDashboardState.widgetPositions, function(n, v) {
          highest = Math.max(highest, v.zIndex);
          });
          
          $(widget).css({"zIndex" : highest+1});
           gDashboardState.widgetPositions[widget.id].zIndex = highest+1;
}



//create the optional iframe to hold the widget version of the app
function createWidget(install, top, left, height, width, zIndex) {

    var widgetSpace = $("#widgets");
    
    var widgetFrame = $("<div/>").addClass("widgetFrame glowy-blue-outline");
    widgetFrame.attr("id", install.origin32);
            
    widgetFrame.css({"top" : top + "px",
                      "left" : left + "px",
                      "width" : (width + 16) + "px",
                      "height" : (height + 16) + "px",
                      "zIndex" : zIndex
                      });
                          
    widgetFrame.click( function() {
       restackWidgets(this);
       saveDashboardState();
    });
                          
    //this is a transparent overlay we move to the top of the widget when dragging or resizing, otherwise the iframe starts grabbing the events,
    // and it gets very laggy and broken
    var hider = $("<div id=\"" + install.origin32 + "hider\" />").addClass("framehider").css({
                          "top" : "8px",
                          "left":"8px",
                          "width" : (width) + "px",
                          "height" : (height) + "px",
                          "zIndex" : "-1000",
                          "position" : "absolute",
                          });
    widgetFrame.append(hider);
    
    var clientFrame = $("<iframe id=\"" + install.origin32 + "client\" />").addClass("clientframe");

    clientFrame.attr("src", install.manifest.widget.path);
    clientFrame.attr("scrolling", "no");
    
    clientFrame.css({
      "width" : width + "px",
      "height" : height + "px",
    }); 
  
    widgetFrame.append(clientFrame);
    
//TO DO: this didn't work.  I wanted a neon green triangle at the bottom right corner as the resize element.  I got it to
// draw there, but it didn't work for resizing
//     var resizeHandle = $("<img/>");
//     resizeHandle.attr("src", "img/resize_handle.png");
//     resizeHandle.attr("id", install.origin32 + "resize");
//     resizeHandle.css({"position" : "absolute", "left": (width + 4) + "px", "top" : (height + 4) + "px"});
//   
//     widgetFrame.append(resizeHandle);

    
    widgetFrame.draggable({containment: widgetSpace,  zIndex: 1000, stack : ".widgetFrame", 
                //unfortunately, iframes steal, or at least borrow, mouse drag events, and so we need to create defensive shields
                // to cover all our iframes when we are doing any mouse dragging.  we hide it behind the view we care about when 
                // we don't need it, and then bring it forward, as you see below, during drags
                 start: function(event, ui) {
                        $(".framehider").css({"zIndex" : 1000});
                   },

                stop: function(event, ui) {
                    //store the new position in the dashboard meta-data
                    gDashboardState.widgetPositions[install.origin32] = {"top": ui.helper.position().top,  "left": ui.helper.position().left,  "height": ui.helper.height() -16, "width": ui.helper.width() -16, "zIndex" : ui.helper.zIndex() };
                    //hide the defensive shield
                    $(".framehider").css({"zIndex" : -1000});
                    saveDashboardState();
                  }
          });
                  
     var selectorString = "#" + install.origin32 + "client, #" + install.origin32 + "hider";
     widgetFrame.resizable({containment: widgetSpace, handles:'se', alsoResize: selectorString, minHeight:  64, minWidth: 64, maxHeight: 400, maxWidth: 400,
     
                //unfortunately, iframes steal, or at least borrow, mouse drag events, and so we need to create defensive shields
                // to cover all our iframes when we are doing any mouse dragging.  we hide it behind the view we care about when 
                // we don't need it, and then bring it forward, as you see below, during drags
                 start: function(event, ui) {
                        restackWidgets(this);
                        saveDashboardState();
                        $(".framehider").css({"zIndex" : 1000});
                   },

                stop: function(event, ui) {
                      //store the new position in the dashboard meta-data
                      gDashboardState.widgetPositions[install.origin32] = {"left": ui.helper.position().left, "top": ui.helper.position().top, "height": ui.helper.height() -16 , "width": ui.helper.width() -16, "zIndex" : ui.helper.zIndex() };
                      //hide the defensive shield
                      $(".framehider").css({"zIndex" : -1000});
                      saveDashboardState();                
                  }
                   
          });

      //resizable changes it to position:relative, so we override it again, or our coordinates are all screwed up
      widgetFrame.css("position", "absolute");

    return widgetFrame;
}

function removeWidget(origin32) {
      //remove the widget and position info for this dead app, and any other cruft we find
      delete gDashboardState.widgetPositions[origin32];
      $(" #widgets > #" + origin32).remove();
};


function toggleWidgetVisibility(origin32) {
  if (!gDashboardState.widgetPositions[origin32]) return;
  if (gDashboardState.widgetPositions[origin32].disabled) {
    delete gDashboardState.widgetPositions[origin32].disabled;
  } else {
    gDashboardState.widgetPositions[origin32].disabled = "YES";
  }
  saveDashboardState();
};


function formatDate(dateStr)
{
  if (!dateStr) return "null";

  var now = new Date();
  var then = new Date(dateStr);

  if (then.getTime() > now.getTime()) {
    return "the future";
  }
  else if (then.getMonth() != now.getMonth() ||  then.getDate() != now.getDate())
  {
     var dayDelta = (new Date().getTime() - then.getTime() ) / 1000 / 60 / 60 / 24 // hours
     if (dayDelta < 2) str = "yesterday";
     else if (dayDelta < 7) str = Math.floor(dayDelta) + " days ago";
     else if (dayDelta < 14) str = "last week";
     else if (dayDelta < 30) str = Math.floor(dayDelta) + " days ago";
     else str = Math.floor(dayDelta /30)  + " month" + ((dayDelta/30>2)?"s":"") + " ago";
  } else {
      var str;
      var hrs = then.getHours();
      var mins = then.getMinutes();

      var hr = Math.floor(Math.floor(hrs) % 12);
      if (hr == 0) hr =12;
      var mins = Math.floor(mins);
      str = hr + ":" + (mins < 10 ? "0" : "") + Math.floor(mins) + " " + (hrs >= 12 ? "P.M." : "A.M.") + " today";
  }
  return str;
}

function onMessage(event)
{
  // unfreeze request message into object
  var msg = JSON.parse(event.data);
  if(!msg) {
    return;
  }
}

function onFocus(event)
{
  updateDashboard( ) ;
}

function updateLoginStatus() {
  navigator.apps.mgmt.loginStatus(function (userInfo, loginInfo) {
    if (! userInfo) {
      $('#login-link a').attr('href', loginInfo.loginLink);
      $('#login-link').show();
    } else {
      $('#username').text(userInfo.email);
      $('#signed-in a').attr('href', loginInfo.logoutLink);
      $('#signed-in').show();
    }
  });
}


if (window.addEventListener) {
    window.addEventListener('message', onMessage, false);
} else if(window.attachEvent) {
    window.attachEvent('onmessage', onMessage);
}

if (window.addEventListener) {
    window.addEventListener('focus', onFocus, false);
} else if(window.attachEvent) {
    window.attachEvent('onfocus', onFocus);
}


///////////////////////////////////////////////
//modal dialog handling code below here

function revealModal(divID)
{
    window.onscroll = function () { document.getElementById(divID).style.top = document.body.scrollTop; };
    document.getElementById(divID).style.display = "block";
    document.getElementById(divID).style.top = document.body.scrollTop;
}

function hideModal(divID)
{
    $("#appinfo").empty();
    document.getElementById(divID).style.display = "none";
}


function createAppInfoPane(origin32) {
      var infoBox = $("<div/>").addClass("appinfobox");
      var install = findInstallForID(origin32);

      var appIcon = $("<div/>").addClass("dockIcon");
      var iconImg = getBigIcon(install.manifest);
      
    //this clips the image properly in FF 3.6, but not in 4
      appIcon.css({
        "background-image": "url(\"" + iconImg + "\")",
        "-moz-background-size": 64,
        "float" : "left"
        });
      infoBox.append(appIcon);
      
      
      var labelBox = $("<div class='labelBox glowy-blue-text'/>");
      
      var appName = $("<div/>").addClass("infoLabel ");
      appName.text(install.manifest.name);  
      appName.disableSelection();
      labelBox.append(appName);

      if (install.manifest.developer && install.manifest.developer.name) {
        var devName = $("<div/>").addClass("infoLabelSmall");
        devName.text(install.manifest.developer.name);  
        devName.disableSelection();
        labelBox.append(devName);
      }
      
      if (install.manifest.developer && install.manifest.developer.url) {
        var devLink = $("<a/>").addClass("infoLabelSmall glowy-blue-text");
        devLink.attr("href", install.manifest.developer.url);
        devLink.attr("target" , "_blank");
        devLink.text(install.manifest.developer.url);
        labelBox.append(devLink);
      }
      infoBox.append(labelBox);

      var descBox = $("<div/>").addClass("descriptionBox glowy-blue-text");
      descBox.text(install.manifest.description);
      infoBox.append(descBox);

      var delButton = $("<div/>").addClass("deleteAppButton glowy-red-text");
      delButton.text("DELETE");
      //this really needs to be moved out into a function
      delButton.click( function() {  navigator.apps.mgmt.uninstall( install.origin,  function() { removeAppFromDock(install.origin32);
                                                                                                  removeWidget(install.origin32);
                                                                                                  saveDashboardState( function () {updateDashboard();} );
                                                                                                  hideModal('modalPage')}  )  });
      infoBox.append(delButton);
      
      if (install.manifest.widget) {
        var widgetButton = $("<div/>").addClass("widgetToggleButton glowy-red-text");
        widgetButton.text("WIDGET");
        widgetButton.click( function() { toggleWidgetVisibility(install.origin32); updateWidgets(); });
        infoBox.append(widgetButton);
      }

      return infoBox;
}







//this doesn't clip properly in either FF 3.6 or FF 4
//   if (iconImg) {
//     var imgelem = $("<img/>"); 
//     imgelem.attr({
//       "src" : iconImg,
//       "width": 64,
//       "height": 64
//     });
//     
//     clickyIcon.append(imgelem);
//   }
  