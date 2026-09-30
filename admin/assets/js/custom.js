$(document).ready(function () { });

$(window).on('load', function () {
    $('.preloader').fadeOut();
});

$(document).on("click", ".menu-bars", function () {
    $("body").addClass("active-menu");
});

$(document).on("click", ".sidebar-close", function () {
    $("body").removeClass("active-menu");
});

$(document).on("click", ".toggle-password.login", function () {
    const container = $(this).closest(".form-group");
    const passwordInput = container.find(".password-input");
    const toggleIcon = $(this).find("i");
    const type = passwordInput.attr("type");

    if (type === "password") {
        passwordInput.attr("type", "text");
        toggleIcon.removeClass("ti-eye-off").addClass("ti-eye");
    } else {
        passwordInput.attr("type", "password");
        toggleIcon.removeClass("ti-eye").addClass("ti-eye-off");
    };
});

$(document).on("click", ".slider-btn", function () {
    $(".main-container").addClass("slider-active");
});

$(document).on("click", ".slide-close-btn", function () {
    $(".main-container").removeClass("slider-active");
});

$(document).on("click", ".toggle-password", function () {
    const container = $(this).closest(".form-input");
    const passwordInput = container.find(".password-input");
    const toggleIcon = $(this).find("i");
    const type = passwordInput.attr("type");
    if (type === "password") {
        passwordInput.attr("type", "text");
        toggleIcon.removeClass("ti-eye-off").addClass("ti-eye");
    } else {
        passwordInput.attr("type", "password");
        toggleIcon.removeClass("ti-eye").addClass("ti-eye-off");
    };
});

$(document).on("click", "#logout-btn", function () {
    $("#logoutModal").modal("show");
});

$(document).on("click", "#confirm-logout", function () {
    postAjaxCall("/logout", {}, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            setTimeout(() => {
                window.location.href = "/login/" + response.data.secret;
            }, 1000);
        };
    });
});

$(document).on("click", ".menu-toggle", function () {
    const $this = $(this);
    const targetId = $this.data("target");
    const $target = $("#" + targetId);
    const $parent = $this.closest(".dropdown-menu-item");

    // Close other dropdowns
    $(".dropdown-menu-item").not($parent).removeClass("active-parent");
    $(".submenu").not($target).stop(true, true).slideUp(200).removeClass("show");

    // Toggle current
    if ($target.hasClass("show")) {
        $target.stop(true, true).slideUp(200).removeClass("show");
        $parent.removeClass("active-parent");
    } else {
        $target.stop(true, true).slideDown(200).addClass("show");
        $parent.addClass("active-parent");
    };
});

// handle time line active class
$(document).on("click", ".filter-timeline", function () {
    $(this).addClass("active").siblings().removeClass("active");
});

function collapseChangeTxt(el) {
    if (el.innerHTML === "Close") el.innerHTML = "See more";
    else el.innerHTML = "Close";
};

// Reset Button for Filter
function toggleResetButtonVisibility(ResetBtn, filterIds) {
    const hasActiveFilters = $(`${filterIds} .filter-data.active`).text().trim() !== "";

    if (hasActiveFilters) {
        $(`${ResetBtn}`).removeClass("d-none");
    } else {
        $(`${ResetBtn}`).addClass("d-none");
    };
};

//  Date format function
function customFormatDate(date, format = "DD/MM/YYYY:hh:mm A") {
    if (!date) return '-';

    const d = new Date(date);
    const map = {
        "DD": ('0' + d.getDate()).slice(-2),
        "MM": ('0' + (d.getMonth() + 1)).slice(-2),
        "YYYY": d.getFullYear(),
        "hh": ('0' + (d.getHours() % 12 || 12)).slice(-2),
        "HH": ('0' + d.getHours()).slice(-2),
        "mm": ('0' + d.getMinutes()).slice(-2),
        "A": d.getHours() >= 12 ? "PM" : "AM"
    };

    return format.replace(/\b(DD|MM|YYYY|hh|HH|mm|A)\b/g, match => map[match]);
};

function formatDate(date) {
    if (!date) {
        return "-";
    };

    let d = new Date(date);
    let day = ('0' + d.getDate()).slice(-2);
    let month = ('0' + (d.getMonth() + 1)).slice(-2);
    let year = d.getFullYear();

    return `${year}-${month}-${day}`;
};