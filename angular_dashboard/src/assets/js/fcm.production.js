/* Production JS
 */
var config = {
    apiKey: "AIzaSyCHJcNcUB2JonJuP1NJ2vTkGYK9ssnD46M",
    authDomain: "iums-fcm.firebaseapp.com",
    databaseURL: "https://iums-fcm.firebaseio.com",
    projectId: "iums-fcm",
    storageBucket: "iums-fcm.appspot.com",
    messagingSenderId: "853843858296"
};

console.log("M:P");

firebase.initializeApp(config);
const messaging = firebase.messaging();

messaging.usePublicVapidKey("BKTKUAKA4Uf0GRtsIqK8bJfhmtlHlr0hINMtfYr46zzceGm63ceiPyDzCl76HoexRZs8kgt13BSqFofhrtUKbTo");

messaging.requestPermission().then(function () {
    messaging.getToken().then(function (currentToken) {
        if (currentToken) {
            sendTokenToServer(currentToken);
        } else {
            console.log('No Instance ID token available. Request permission to generate one.');
            //setTokenSentToServer(false);
        }
    }).catch(function (err) {
        console.log('An error occurred while retrieving token. ', err);
        //setTokenSentToServer(false);
    });
}).catch(function (err) {
    console.log('Unable to get permission to notify.', err);
});

messaging.onTokenRefresh(function () {
    messaging.getToken().then(function (refreshedToken) {
        //setTokenSentToServer(false);
        sendTokenToServer(refreshedToken);
    }).catch(function (err) {
        console.log('Unable to retrieve refreshed token ', err);
    });
});

messaging.onMessage(function (payload) {
    var notificationTitle = payload.notification.title;
    var notificationOptions = {
        body: payload.notification.body,
        icon: 'https://iums.aust.edu/branding.jpg'
    };
    new Notification(notificationTitle, notificationOptions);
});

// function setTokenSentToServer(sent) {
//     window.localStorage.setItem('sentToServer', sent ? 1 : 0);
// }
//
// function isTokenSentToServer() {
//     return window.localStorage.getItem('sentToServer');
// }

function sendTokenToServer(currentToken) {
    $.ajax({
        crossDomain: true,
        type: "POST",
        async: true,
        url: window.location.origin + '/ums-webservice-academic/fcmToken',
        contentType: 'application/json',
        data: '{"entries" : { "fcmToken":"' + currentToken + '" } }',
        headers: {
            "Authorization": JSON.parse(sessionStorage.getItem("ums.token"))["access_token"],
            "Accept": "application/json"
        },
        success: function (response) {
            console.log("FCM Token Sent Successfully");
            //setTokenSentToServer(true);
        },
        error: (function (error) {
            console.log("error in saving");
            console.log(error);
        })
    });
}