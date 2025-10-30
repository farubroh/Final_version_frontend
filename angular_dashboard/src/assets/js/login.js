var Authentication = (function () {
    var endpointUrl;
    function Authentication(pEndpoint) {
        endpointUrl = pEndpoint;
    }
    Authentication.prototype.authenticate = function (pUserName, pPassword) {
        var userName = pUserName ? pUserName : document.getElementById('userName').value;
        var password = pPassword ? pPassword : document.getElementById('password').value;
        var reCaptchaResponse = $('#g-recaptcha-response').val(); /*grecaptcha.getResponse(loginCaptcha);*/

        if(userName && password) {
            $.ajax({
                type: "GET",
                url: loginAttemptCountUrl,
                data: {username: $('#userName').val()},
                async: false,
                dataType: "json",
                success: function (data) {
                    if (data > 3 && reCaptchaResponse === "") {
                        $('#loginCaptcha').css('display', 'block');
                        presentErrorMessage("login_msg", "Please check reCaptcha!");
                    }
                    else {
                        $(".loaderDiv").show();
                        $("#login_btn").hide();

                        var credentials = "Basic " + btoa(userName + ":" + password);
                        $.ajax({
                            crossDomain: true,
                            type: "GET",
                            async: true,
                            url: endpointUrl,
                            dataType: 'json',
                            data: {
                                captchaResponse: reCaptchaResponse,
                                userId: userName
                            },
                            withCredentials: true,
                            headers: {
                                "Authorization": credentials,
                                "Accept": "application/json"
                            },
                            success: function (tokens) {
                                startApplication(tokens);
                            },
                            fail: function (msg) {
                                console.error("Login failed....");
                                grecaptcha.reset(loginCaptcha);
                                getLoginAttemptCount();
                            },
                            error: (function (httpObj, textStatus) {
                                console.log(httpObj);
                                if (httpObj.status == 200) {
                                    startApplication();
                                }
                                else if (httpObj.status == 401) {
                                    presentErrorMessage("login_msg", httpObj.responseText);
                                    if ($("#minSpan" ).length) {
                                        setLockTimer();
                                    }
                                    if(data>3) {
                                        $('#loginCaptcha').css('display', 'block');
                                    } else {
                                        $('#loginCaptcha').css('display', 'none');
                                    }
                                }
                                else {
                                    presentErrorMessage("login_msg", "Service Unavailable. Error code ("+httpObj.status == 200+")" + textStatus);
                                }
                                $(".loaderDiv").hide();
                                $("#login_btn").show();
                                grecaptcha.reset(loginCaptcha);
                            })
                        });
                    }
                },
                error: function () {
                    console.log("error occurred...");
                    presentErrorMessage("login_msg", "Service Unavailable.");
                }
            });
        }
        else{
            presentErrorMessage("login_msg", "Please fill up User ID and Password.");
        }
    };

    Authentication.prototype.forgotPassword = function () {
        var userId = $('#userId_forgotPassword').val();
        var captchaResponse = grecaptcha.getResponse(forgotPasswordCaptcha);
        var userIdPattern = /^[0-9a-zA-Z]+$/; /*For numeric only use this pattern /^\d+$/;*/

        if(userId) {
            if(userIdPattern.test(userId)) {
                if (captchaResponse === "") {
                    presentErrorMessage("forgot_password_msg", "Please check reCaptcha!");
                } else {
                    $(".loaderDiv").show();
                    $("#btn_forgotPassword").hide();
                    $("#forgot_password_msg").hide();
                    $.ajax({
                        crossDomain: true,
                        type: "PUT",
                        async: true,
                        url: forgotPasswordUrl,
                        contentType: 'application/json',
                        data: '{"userId":"' + userId + '","captchaResponse":"' + captchaResponse + '"}',
                        success: function (response) {
                            $(".successdDiv").show();
                            $(".fPasswordDiv").hide();
                            $(".loaderDiv").hide();
                            $("#btn_forgotPassword").show();
                            $("#login_msg").hide();
                            grecaptcha.reset(forgotPasswordCaptcha);
                        },
                        error: (function (error) {
                            presentErrorMessage("forgot_password_msg", "<b>Sorry</b>, " + error.responseText);
                            $(".loaderDiv").hide();
                            $("#btn_forgotPassword").show();
                            grecaptcha.reset(forgotPasswordCaptcha);
                        })
                    });
                }
            }
            else{
                presentErrorMessage("forgot_password_msg", "Please check your user id. Do not provide (.), (-) or (/) in your User id.");
            }
        }
        else{
            presentErrorMessage("forgot_password_msg", "Please fill up user Id.");
        }
    };

    Authentication.prototype.changePassword = function () {
        /*var _this = this;*/
        var resetToken = $("#password_reset_token").val();
        var newPassword = $("#new_password").val();
        var confirmNewPassword = $("#confirm_new_password").val();

        if(resetToken && newPassword && confirmNewPassword) {
            if (newPassword != confirmNewPassword) {
                /*alert("New Password and Confirm New Password are not equal.");*/
                presentErrorMessage("reset_password_msg", "New Password and Confirm New Password are not equal.");
                return;
            }

            $(".loaderDiv").show();
            $("#btn_change_password").hide();
            $.ajax({
                crossDomain: true,
                type: "POST",
                async: true,
                url: resetPasswordUrl,
                contentType: 'application/json',
                data: '{"passwordResetToken":"' + resetToken + '","newPassword":"' + newPassword + '","confirmNewPassword":"' + confirmNewPassword + '"}',
                success: function (response) {
                    /*_this.authenticate(response.userId, newPassword);*/
                    $('<a href="' + getOrigin() + getBaseAppUrl() + 'login"> Go to login </a>').appendTo($('#loginRef'));
                    $(".loaderDiv").hide();
                    $(".signInDiv").hide();
                    $("#success-msg").show();
                },
                error: (function (error) {
                    $(".loaderDiv").hide();
                    $("#btn_change_password").show();
                    presentErrorMessage("reset_password_msg", "<b>Sorry</b>, " + error.responseJSON.message + "<br /><a href='" + getOrigin() + getBaseAppUrl() + "login?redirect=true'>Click here</a> to recover your password again.");
                })
            });
        }
        else{
            presentErrorMessage("reset_password_msg", "Please fill up the fields correctly.");
        }
    };

    function startApplication(tokens) {
        sessionStorage.setItem("ums.token", JSON.stringify(tokens));
        var params = getQueryParams();
        if (isValidRedirectTo()) {
            window.location.href = decodeURIComponent(params.redirectTo);
        }
        else {
            window.location.href = getBaseAppUrl() + 'iums/#/';
        }
    }

    function isValidRedirectTo() {
        var params = getQueryParams();
        if (params.redirectTo) {
            var redirectTo = decodeURIComponent(params.redirectTo);
            var hostName = getHostname(redirectTo);
            if (isSameHost(hostName) && isUMSApp(redirectTo)) {
                return true;
            }
        }
        return false;
    }

    function isUMSApp(redirectTo) {
        var origin = getOrigin(redirectTo);
        return redirectTo.replace(origin, '').indexOf('/ums-web') == 0;
    }

    function isSameHost(hostname) {
        var currentHostName = window.location.hostname;
        return currentHostName === hostname;
    }

    function getHostname(href) {
        var l = getLocation(href);
        return l.hostname;
    }

    function getOrigin(href) {
        var l = getLocation(href);
        return l.origin;
    }

    function getLocation(href) {
        var l = document.createElement("a");
        l.href = href;
        return l;
    }

    function getQueryParams() {
        var params = {};
        var pairs = window.location.search.replace('?', '').split('&');
        for (var i = 0; i < pairs.length; i++) {
            var split = pairs[i].split('=');
            if (split[0] != '') {
                params[split[0]] = split[1];
            }
        }
        return params;
    }

    function presentErrorMessage(divId, msg) {
        document.getElementById(divId).innerHTML = msg;
        $("#" + divId).show();
    }

    function getBaseAppUrl() {
        return window.location.pathname.substring(0, window.location.pathname.indexOf('/', 1) + 1);
    }


    function getLoginAttemptCount() {
        $.ajax({
            type: "GET",
            url: loginAttemptCountUrl,
            data: { username: $('#userName').val() },
            async: false,
            dataType: "json",
            success: function (data) {
                if (data >= 3) {
                    $('#loginCaptcha').css('display', 'block');
                } else {
                    $('#loginCaptcha').css('display', 'none');
                }
            },
            error: function () {
                console.log("error occurred...");
            }
        });
    }


    function setLockTimer() {

        var remainingSeconds = parseInt($("#minSpan").html()) * 60 + parseInt($("#secSpan").html());
        console.log(remainingSeconds);
        var clockTimer = +localStorage.getItem("clockTimer");
        clearInterval(clockTimer);

        var minutes = parseInt((remainingSeconds / 60) + '');
        var seconds = remainingSeconds % 60;
        $("#minSpan").html( ("0" + minutes).slice(-2));
        $("#secSpan").html( ("0" + seconds).slice(-2));

        var cTimer = setInterval(function() {
            var minutes = parseInt((remainingSeconds / 60) + '');
            var seconds = remainingSeconds % 60;

            if (remainingSeconds < 0) {
                clearInterval(cTimer);
            } else {
                remainingSeconds = remainingSeconds - 1;
                $("#minSpan").html( ("0" + minutes).slice(-2));
                $("#secSpan").html( ("0" + seconds).slice(-2));
            }
        }, 1000);

        localStorage["clockTimer"] = cTimer;
    }

    return Authentication;
})();


$(document).ready(function(){
    const vars = getQueryParams();

    if(vars['token'] && vars['expires']){
        startApplication(vars['token'], vars['expires']);
    }

    function getQueryParams() {
        const params = {};
        const pairs = window.location.search.replace('?', '').split('&');
        for (let i = 0; i < pairs.length; i++) {
            const split = pairs[i].split('=');
            if (split[0] != '') {
                params[split[0]] = split[1];
            }
        }
        return params;
    }

    function getBaseAppUrl() {
        return window.location.pathname.substring(0, window.location.pathname.indexOf('/', 1) + 1);
    }

    function startApplication(tokens, expires) {
        const token = {
            'access_token': 'Bearer '+tokens,
            'expires_in': expires
        }

        //alert(JSON.stringify(token));
        sessionStorage.clear();
        sessionStorage.setItem("ums.token", JSON.stringify(token));
        const params = getQueryParams();
        window.location.href = getBaseAppUrl() + 'iums/#/';

    }
})