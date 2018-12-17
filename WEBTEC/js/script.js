$(document).ready(function() {

 if ((navigator.userAgent.indexOf("MSIE") != -1) || (!!document.documentMode == true)) //IF IE > 10
 {
  alert('This website doesn\'t work with this browser!');
  window.location = "https://html5test.com/";
 } else {
  chat.init();
 }
});

var chat = {

 // data holds variables for use in the class:

 data: {
  lastID: 0,
  noActivity: 0
 },

 // Init binds event listeners and sets up timers:

 init: function() {

  // Using the defaultText jQuery plugin, included at the bottom:
  chat.setDefaultText();

  $('#gridContainer').shards([0, 0, 0, .5], [255, 0, 0, .2], [255, 255, 0, .1], 10, 2, 2, .1, true);

  // We use the working variable to prevent
  // multiple form submissions:

  var working = false;

  // Logging a person in the chat:

  $('#loginForm').submit(function() {

   if (working) return false;
   working = true;

   // Using our chatPOST wrapper function
   // (defined in the bottom):

   $.chatPOST('login', $(this).serialize(), function(r) {
    working = false;

    if (r.error) {
     chat.displayError(r.error);
    } else {
     chat.displaySuccess("Successfully logged in using your login credentials");
     chat.login(r.name, r.gravatar, r.priv);
    }
   });

   return false;
  });

  $('#registerForm').submit(function() {

   if (working) return false;
   working = true;

   // Using our chatPOST wrapper function
   // (defined in the bottom):

   $.chatPOST('register', $(this).serialize(), function(r) {
    working = false;

    if (r.error) {
     chat.displayError(r.error);
    } else {
     chat.displaySuccess("Successfully registered! Please wait until your account was activated");
     $('#registerForm').css({
      "display": "none"
     });
     $('#loginForm').css({
      "display": "grid"
     });
    }
   });

   chat.setDefaultText();
   return false;
  });

  // Submitting a new chat entry:

  $('#submitForm').submit(function() {

   var text = $('#chatText').val();

   if (text.length == 0) {
    return false;
   }

   if (working) return false;
   working = true;

   // Assigning a temporary ID to the chat:
   var tempID = 't' + Math.round(Math.random() * 1000000),
    params = {
     id: tempID,
     author: chat.data.name,
     gravatar: chat.data.gravatar,
     text: text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    };

   // Using our addChatLine method to add the chat
   // to the screen immediately, without waiting for
   // the AJAX request to complete:

   chat.addChatLine($.extend({}, params));

   // Using our chatPOST wrapper method to send the chat
   // via a POST AJAX request:

   $.chatPOST('submitChat', $(this).serialize(), function(r) {

    if (r.error) {
     chat.displayError(r.error);
	 $('div.chat-' + tempID).remove();
    } else {
     working = false;

     $('#chatText').val('');
	 
     params['id'] = r.insertID;
     chat.addChatLine($.extend({}, params));

     $('div.chat-' + tempID).remove();
    }
   });

   return false;
  });

  // Logging the user out:

  $('#logoutButton').click((function() {
   $('#chatTopBar > span').fadeOut(function() {
    $(this).remove();
   });

   $('#submitForm').fadeOut(function() {
    $('#loginForm').fadeIn.css("display", "grid")();
   });

   $.chatPOST('logout');

   chat.displaySuccess("Loged out successfully!");

   return false;
  }));

  $('#registerButton').click((function() {
   $('#loginForm').css({
    "display": "none"
   });
   $('#registerForm').css({
    "display": "grid"
   });
  }));

  // Checking whether the user is already logged (browser refresh)


  $.chatGET('checkLogged', function(r) {
   if (r.logged) {
    chat.login(r.loggedAs.name, r.loggedAs.gravatar, r.loggedAs.priv);
   } else {
    $('#loginForm').css({
     "display": "grid"
    });
   }
  });

  // Self executing timeout functions

  (function getChatsTimeoutFunction() {
   chat.getChats(getChatsTimeoutFunction);
  })();

  (function getUsersTimeoutFunction() {
   chat.getUsers(getUsersTimeoutFunction);
  })();

 },

 showAdmin: function() {

  if (chat.data.priv != 1) {
   chat.displayError("You dont have permissions to access this content!");
   return 1;
  }

  $('#chatLineHolder').css({
   "display": "none"
  });
  $('#chatUsers').css({
   "display": "none"
  });
  $('#chatBottomBar').css({
   "display": "none"
  });
  $('#adminPanel').css({
   "display": "block"
  });

  $("#adminButton").prop("value", "Chat");

  $("#adminButton").unbind();
  $('#adminButton').on('click', function() {
   chat.showChat();
  });

  $.chatPOST('adminView', $(this).serialize(), function(r) {

   if (r.error) {
    chat.displayError(r.error);
    chat.showChat();
   }

   var content = '<div id="userAdminTopBarMain"><div id="userPictureTopBar">Picture</div><div id="userNameTopBar">Name</div><div id="userEmailTopBar">Email</div><div id="userActiveTopBar">Active</div><div id="userAdminTopBar">Admin</div><div id="userSaveTopBar">Save</div><div id="userDeleteTopBar">Delete</div></div>';

   $("#adminPanel").html(content);

   for (var i = 0; i < r.users.length; i++) {
    if (r.users[i]) {

     var params = {
      id: i,
      name: r.users[i].name,
      email: r.users[i].email,
      gravatar: r.users[i].gravatar,
     };

     $("#adminPanel").append(chat.render('userAdmin', params));

     if (r.users[i].admin == 1) {
      $("#userAdminCheckbox-" + i).prop("checked", true)
     }
     if (r.users[i].active == 1) {
      $("#userActiveCheckbox-" + i).prop("checked", true)
     }
    }
   }
  });

  $(document.body).on('submit', '.userSaveForm', function() {

   $.chatPOST('adminChangeUser', $(this).serialize(), function(r) {

    if (r.error) {
     chat.displayError(r.error);
    } else {
     chat.displaySuccess("Successfully changed the user!");
    }
   });

   return false;
  });


  $(document.body).on('submit', '.userDeleteForm', function() {

   $.chatPOST('adminDeleteUser', $(this).serialize(), function(r) {

    if (r.error) {
     chat.displayError(r.error);
    } else {
     chat.displaySuccess("Successfully deleted the selected user!");
     $("#userAdmin-" + r.id).css({
      "display": "none"
     });
    }
   });

   return false;
  });

 },

 showChat: function() {

  $('#chatLineHolder').css({
   "display": "block"
  });
  $('#chatUsers').css({
   "display": "block"
  });
  $('#chatBottomBar').css({
   "display": "block"
  });
  $('#adminPanel').css({
   "display": "none"
  });

  $("#adminButton").prop("value", "Admin");

  $("#adminButton").unbind();
  $('#adminButton').on('click', function() {
   chat.showAdmin();
  });

  $(document.body).off('submit', '.userSaveForm');
  $(document.body).off('submit', '.userDeleteForm');
 },

 logout: function() {

  chat.showChat();

  $('#chatTopBar > div').fadeOut(function() {
   $(this).remove();
  });

  $('#submitForm').fadeOut(function() {
   $("#loginForm").fadeIn().css("display", "grid");
  });

  $.chatPOST('logout');

  chat.data = {
   lastID: 0,
   noActivity: 0
  };

  $('#chatLineHolder').html("");
  chat.getChats();
 },


 // The login method hides displays the
 // user's login data and shows the submit form

 login: function(name, gravatar, priv, mode, logged) {

  chat.data.name = name;
  chat.data.gravatar = gravatar;
  chat.data.priv = priv;

  if (priv == 1) {
   $('#chatTopBar').html(chat.render('loginTopBarAdmin', chat.data));

   $('#adminButton').unbind();
   $('#adminButton').on('click', function() {
    chat.showAdmin();
   });
  } else {
   $('#chatTopBar').html(chat.render('loginTopBar', chat.data));
  }

  $('#logoutButton').unbind();
  $('#logoutButton').on('click', function() {
   chat.logout();
  });

  $('#loginForm').fadeOut();
  $('#submitForm').fadeIn().css("display", "grid");
  $('#chatText').focus();

  var userContainerHeight = $('#logoutButton').height();
  $('#userImage').css("width", userContainerHeight);
  $('#userImage').css("height", userContainerHeight);

  chat.setDefaultText();

  chat.data.lastID = 0;
  chat.getChats();

 },

 // The render method generates the HTML markup 
 // that is needed by the other methods:

 render: function(template, params) {

  for (var index in params) {
   if (params.hasOwnProperty(index)) {
    //params[index] = chat.htmlEncode(params[index]);
   }
  }

  var arr = [];
  switch (template) {
   case 'loginTopBar':
    arr = [
     '<div id="userContainer"><img id="userImage" src="', params.gravatar, '" width="23" height="23" />',
     '<span class="name" style="margin-left: 10px">', params.name,
     '</div><div id="buttonContainer"><input id="logoutButton" type="button" class="logoutButton" value="Logout" style="width:100%"/></div>'
    ];
    break;

   case 'loginTopBarAdmin':
    arr = [
     '<div id="userContainer">',
     '<img id="userImage" src="', params.gravatar, '" width="23" height="23" />',
     '<span class="name" style="margin-left: 10px">', params.name,
     '</div>',
     '<div id="buttonContainerAdmin"><input id="adminButton" type="button" class="adminButton" value="Admin"/><input id="logoutButton" type="button" class="logoutButton" value="Logout"/></div>',
     '<div id="buttonContainerMobile" style="display: none;"><input id="adminNav" type="button" class="adminNav" value="Nav" onclick="chat.mobileNavigationShow()"/></div>'
    ];
    break;

   case 'chatLine':
    arr = [
     '<div class="chat chat-', params.id, '">',
     '<div class="chatLineInfo">',
     '<img src="', params.gravatar, '" width="40" height="40" onload="this.style.visibility=\'visible\'" />',
     '<span class="author">', params.author, ':</span>',
     '</div>',
     '<div class="chatTextBox">',
     '<div class="chatText">',
     params.text,
     '<div>',
     '</div>',
     '<span class="time">', params.time, '</span>',
     '</div>'
    ];
    break;

   case 'chatLineAdmin':
    arr = [
     '<div class="chat chat-', params.id, '">',
     '<div class="chatLineInfo">',
     '<img src="', params.gravatar, '" width="40" height="40" onload="this.style.visibility=\'visible\'" />',
     '<span class="author">', params.author, ':</span>',
     '</div>',
     '<div class="chatTextBox">',
     '<div class="chatText">',
     params.text,
     '</div>',
     '</div>',
     '<div class="deleteMessageBox">',
     '<span class="time">', params.time, '</span>',
     '<form id="deleteMessageForm-', params.id, '"class="deleteMessageForm" method="post" action="">',
     '<input type="hidden" name="id" value="', params.id, '"/>',
     '<input type="submit" value="Delete" class="messageDeleteButton" name="messageDeleteButton"/>',
     '</form>',
     '</div>',
     '</div>'
    ];
    break;

   case 'userAdmin':
    arr = [
     '<div id="userAdmin-', params.id, '" class="userAdmin">',
     '<div class="userPicture">',
     '<img id="userPicture-', params.id, '" src="', params.gravatar, '" width="23" height="23" />',
     '</div>',
     '<div class="userName">',
     params.name,
     '</div>',
     '<div class="userEmail">',
     params.email,
     '</div>',
     '<form class="userSaveForm" method="post" action="">',
     '<input type="hidden" name="name" value="', params.name, '"/>',
     '<input type="hidden" name="email" value="', params.email, '"/>',
     '<input type="hidden" name="id" value="', params.id, '"/>',
     '<div class="userActiveCheckboxDiv"><span class="mobileDescription">Active:</span><input id="userActiveCheckbox-', params.id, '" type="checkbox" class="userActiveCheckbox" name="userActiveCheckbox"/></div>',
     '<div class="userAdminCheckboxDiv"><span class="mobileDescription">Admin:</span><input id="userAdminCheckbox-', params.id, '" type="checkbox" class="userAdminCheckbox" name="userAdminCheckbox"/></div>',
     '<div id="userSaveButton-', params.id, '" class="userSaveButton"><input id="userSaveDeleteBox-', params.id, '" type="submit" class="userAdminSaveButton" name="userAdminSaveButton" value="Save"/></div>',
     '</form>',
     '<form class="userDeleteForm" method="post" action="">',
     '<input type="hidden" name="name" value="', params.name, '"/>',
     '<input type="hidden" name="email" value="', params.email, '"/>',
     '<input type="hidden" name="id" value="', params.id, '"/>',
     '<div id="userDeleteButton-', params.id, '" class="userDeleteButton"><input id="userAdminDeleteBox-', params.id, '" type="submit" class="userAdminDeleteButton" name="userAdminDeleteButton" value="Delete"/></div>',
     '</form>',
     '</div>'
    ];
    break;

   case 'user':
    arr = [
     '<div class="user" title="', params.name, '"><img src="',
     params.gravatar, '" width="30" height="30" onload="this.style.visibility=\'visible\'" /></div>'
    ];
    break;
  }

  // A single array join is faster than
  // multiple concatenations

  return arr.join('');

 },

 // The addChatLine method ads a chat entry to the page

 addChatLine: function(params) {

  // All times are displayed in the user's timezone

  var d = new Date();
  if (params.time) {

   // PHP returns the time in UTC (GMT). We use it to feed the date
   // object and later output it in the user's timezone. JavaScript
   // internally converts it for us.

   d.setUTCHours(params.time.hours, params.time.minutes);
  }

  params.time = (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' +
   (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();

  if (chat.data.priv == 1) {
   var markup = chat.render('chatLineAdmin', params),
    exists = $('#chatLineHolder .chat-' + params.id);
  } else {
   var markup = chat.render('chatLine', params),
    exists = $('#chatLineHolder .chat-' + params.id);
  }


  if (exists.length) {
   exists.remove();
  }

  if (!chat.data.lastID) {
   // If this is the first chat, remove the
   // paragraph saying there aren't any:

   $('#chatLineHolder p').remove();
  }

  // If this isn't a temporary chat:
  if (params.id.toString().charAt(0) != 't') {
   var previous = $('#chatLineHolder .chat-' + (+params.id - 1));
   if (previous.length) {
    previous.after(markup);
   } else $('#chatLineHolder').append(markup);
  } else $('#chatLineHolder').append(markup);

	$("#chatLineHolder").scrollTop($("#chatLineHolder")[0].scrollHeight);

  $(document.body).off('submit', '#deleteMessageForm-' + params.id);
  $(document.body).on('submit', '#deleteMessageForm-' + params.id, function() {

   $.chatPOST('deleteMessage', $(this).serialize(), function(r) {
    if (r.error) {
     chat.displayError(r.error);
    } else {
     $('.chat-' + r.id).css("display", "none");
     chat.displaySuccess("Successfully deleted the selected message!");
    }
   });

   return false;
  });
 },

 // This method requests the latest chats
 // (since lastID), and adds them to the page.

 getChats: function(callback) {
  $.chatGET('getChats', {
   lastID: chat.data.lastID
  }, function(r) {

   if (r.error) {
    chat.displayError(r);
   } else {

    for (var i = 0; i < r.chats.length; i++) {
     chat.addChatLine(r.chats[i]);
    }

    if (r.chats.length) {
     chat.data.noActivity = 0;
     chat.data.lastID = r.chats[i - 1].id;
    } else {
     chat.data.noActivity++;
    }

    if (!chat.data.lastID) {
     $('#chatLineHolder').html('<p class="noChats">No chats yet</p>');
    }

    // Setting a timeout for the next request,
    // depending on the chat activity:

    var nextRequest = 1000;

    // 2 seconds
    if (chat.data.noActivity > 3) {
     nextRequest = 2000;
    }

    if (chat.data.noActivity > 10) {
     nextRequest = 5000;
    }

    // 15 seconds
    if (chat.data.noActivity > 20) {
     nextRequest = 15000;
    }

    setTimeout(callback, nextRequest);

   }


  });
 },

 // Requesting a list with all the users.

 getUsers: function(callback) {
  $.chatGET('getUsers', function(r) {

   if (r.error) {
    chat.displayError(r.error);
   } else {

    var users = [];

    for (var i = 0; i < r.users.length; i++) {
     if (r.users[i]) {
      users.push(chat.render('user', r.users[i]));
     }
    }

    var message = '';

    if (r.total < 1) {
     message = 'No one is online';
    } else {
     message = r.total + ' ' + (r.total == 1 ? 'person' : 'people') + ' online';
    }

    users.push('<p class="count">' + message + '</p>');

    $('#chatUsers').html(users.join(''));

    setTimeout(callback, 15000);

   }

  });
 },

 // This method displays an error message on the top of the page:

 displayError: function(msg) {
  var elem = $('<div>', {
   id: 'chatErrorMessage',
   html: msg
  });

  elem.click(function() {
   $(this).fadeOut(function() {
    $(this).remove();
   });
  });

  setTimeout(function() {
   elem.click();
  }, 5000);

  elem.hide().appendTo('body').slideDown();
 },

 displaySuccess: function(msg) {
  var elem = $('<div>', {
   id: 'chatSuccessMessage',
   html: msg
  });

  elem.click(function() {
   $(this).fadeOut(function() {
    $(this).remove();
   });
  });

  setTimeout(function() {
   elem.click();
  }, 5000);

  elem.hide().appendTo('body').slideDown();
 },

 setDefaultText: function() {
  $('#name').defaultText('Nickname');
  $('#email').defaultText('Email (Gravatars are Enabled)');
  $('#pwRegister').defaultText('Password');
  $('#pwLogin').defaultText('Password');
  $('#nameormail').defaultText('Enter your nickname or email');
  $('#registerName').val('Name')
  $('#registerMail').val('Email')
  $('#registerPW').val('PW')
 },

 htmlEncode: function(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
 },

 mobileNavigationShow: function() {
  var oldHTML = $('#chatTopBar').html();
  var newHTML = '<input type="button" style="width: 33.3vw" value="Back" onclick="chat.mobileNavigationHide()"/><input type="button" style="width: 33.3vw; background-color: green;" value="Admin" onclick="chat.showAdminMobile()"/><input type="button" style="width: 33.3vw; background-color: red;" onclick="chat.logout()" value="Logout"/>';

  $('#chatTopBar').html(newHTML);
 },

 mobileNavigationHide: function(html) {
  $('#chatTopBar').html(chat.render('loginTopBarAdmin', chat.data));
 },

 showAdminMobile: function() {
  chat.showAdmin();

  var newHTML = '<input type="button" style="width: 33.3vw" value="Back" onclick="chat.mobileNavigationHide()"/><input type="button" style="width: 33.3vw; background-color: green;" value="Chat" onclick="chat.showChatMobile()"/><input type="button" style="width: 33.3vw; background-color: red;" onclick="chat.logout()" value="Logout"/>';

  $('#chatTopBar').html(newHTML);
 },

 showChatMobile: function() {
  chat.showChat();
  chat.mobileNavigationHide();
 }

};

// Custom GET & POST wrappers:

$.chatPOST = function(action, data, callback) {
 $.post('php/ajax.php?action=' + action, data, callback, 'json');
}

$.chatGET = function(action, data, callback) {
 $.get('php/ajax.php?action=' + action, data, callback, 'json');
}

// A custom jQuery method for placeholder text:

$.fn.defaultText = function(value) {

 var element = this.eq(0);
 element.data('defaultText', value);

 element.focus(function() {
  if (element.val() == value) {
   element.val('').removeClass('defaultText');
  }
 }).blur(function() {
  if (element.val() == '' || element.val() == value) {
   element.addClass('defaultText').val(value);
  }
 });

 return element.blur();
}