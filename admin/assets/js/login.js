$(document).on("click", "#login", function () {
    const email = $("#email").val();
    const password = $("#password").val();

    if (email === "") {
        showToast(0, "Please enter your email");
        return;
    };

    if (password === "") {
        showToast(0, "Please enter your password");
        return;
    };

    const data = {
        email: email,
        password: password,
    };

    postAjaxCall("/login", data, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 1000);
        };
    });
});

$(document).on("input", "#email, #password", function () {
    const email = $("#email").val();
    const password = $("#password").val();

    if (email && password) {
        $("#login").attr("disabled", false);
    } else {
        $("#login").attr("disabled", true);
    };
});

$(document).on('keypress', '#email, #password', function (e) {
    if (e.key === "Enter") {
        $('#login').click();
    };
});