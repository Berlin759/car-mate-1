$(window).on('load', function () { // makes sure the whole site is loaded 
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

$(document).ready(function () {
    $(".slider-btn").click(function () {
        $(".main-container").addClass("slider-active");
    });
    $(".slide-close-btn").click(function () {
        $(".main-container").removeClass("slider-active");
    });
});

$(document).ready(function () {
    $(".toggle-password").on("click", function () {
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
});

$(document).ready(function () {
    const chatList = $('.chat-list');
    const chatArea = $('.chatting-area-lg');
    const chatTopics = $('.chating-topic');

    chatList.on('click', (event) => {
        const chatItem = event.target.closest('.chat-item');
        if (chatItem) {
            if (window.innerWidth <= 768) {
                chatTopics.style.display = 'none';
                chatArea.style.display = 'block';
            };
        };
    });
    const backBtn = $('.chat-back');
    if (backBtn) {
        backBtn.on('click', () => {
            chatTopics.style.display = 'block';
            chatArea.style.display = 'none';
        });
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

// handle time line active class
$(document).on("click", ".filter-timeline", function () {
    $(this).addClass("active").siblings().removeClass("active");
});

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