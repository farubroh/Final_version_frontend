var config = {
    apiKey: "AIzaSyArP6rXmkpIkUSF4qlnpUAIYTv8wpdjrGM",
    authDomain: "fcm-integration-fac11.firebaseapp.com",
    databaseURL: "https://fcm-integration-fac11.firebaseio.com",
    projectId: "fcm-integration-fac11",
    storageBucket: "fcm-integration-fac11.appspot.com",
    messagingSenderId: "485026400295"
};

firebase.initializeApp(config);
const messaging = firebase.messaging();

messaging.usePublicVapidKey("BAE6EP1tbAjy1H4SkgRdaTnwd0OLOJ0oWsFTTOSBPajli-HhTYG69pyz4XztvtAHl6GhB3cmm-iF51mnYwU-_4o");

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

function sendTokenToServer(currentToken) {
    $.ajax({
        crossDomain: true,
        type: "POST",
        async: true,
        url: fcmEndpointUrl,
        contentType: 'application/json',
        data: '{"entries" : { "fcmToken":"' + currentToken + '" } }',
        headers: {
            "Authorization": JSON.parse(sessionStorage.getItem("ums.token"))["access_token"],
            "Accept": "application/json"
        },
        success: function (response) {
            //console.log("FCM Token Sent Successfully");
            //setTokenSentToServer(true);
        },
        error: (function (error) {
            console.log("error in saving");
            console.log(error);
        })
    });
}