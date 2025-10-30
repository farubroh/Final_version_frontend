var loginCaptcha;
var forgotPasswordCaptcha;

var onloadCallback = function () {
    loginCaptcha = grecaptcha.render('loginCaptcha', {
        'sitekey': '6LdDBocUAAAAAGwKto7l0gLIdciNhQ5pGHA9hX0N',
        'theme': 'light'
    });
    forgotPasswordCaptcha = grecaptcha.render('forgotPasswordCaptcha', {
        'sitekey': '6LdDBocUAAAAAGwKto7l0gLIdciNhQ5pGHA9hX0N',
        'theme': 'light'
    });
};