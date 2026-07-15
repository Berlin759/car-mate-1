$(document).on("change", "#maintenance", function () {
    if ($(this).is(":checked")) {
        $(this).val("2");
    } else {
        $(this).val("1");
    };
});

$(document).on("click", "#updateSettings", function () {
    $("#update-settings-loader").removeClass("d-none");

    const maintenance = $("#maintenance").val();
    const login_secret_token = $("#login_secret_token").val();

    const data = {
        login_secret_token: login_secret_token,
        maintenance: maintenance,
    };

    postAjaxCall("/update-settings", data, function (response) {
        showToast(response.flag, response.msg);

        $("#update-settings-loader").addClass("d-none");

        if (response.flag === 1) {
            setTimeout(function () {
                window.location.reload();
            }, 1000);
        };
    });
});

$(document).on("input", "#new_password, #current_password", function () {
    const new_password = $("#new_password").val();
    const current_password = $("#current_password").val();

    if (new_password && current_password) {
        $("#updatePassword").attr("disabled", false);
    } else {
        $("#updatePassword").attr("disabled", true);
    };
});

$(document).on("click", "#updatePassword", function () {
    $("#change-password-loader").removeClass("d-none");
    const new_password = $("#new_password").val();
    const current_password = $("#current_password").val();

    if (new_password === current_password) {
        showToast(0, "New password cannot be the same as the current password.");
        $("#change-password-loader").addClass("d-none");
        return;
    };

    const data = {
        current_password: current_password,
        new_password: new_password,
    };

    postAjaxCall("/update-password", data, function (response) {
        showToast(response.flag, response.msg);

        $("#change-password-loader").addClass("d-none");

        if (response.flag === 1) {
            setTimeout(function () {
                window.location.reload();
            }, 1000);
        };
    });
});

$(document).on("keypress", "#new_password, #current_password", function (e) {
    if (e.key === "Enter") {
        $("#updatePassword").click();
    };
});