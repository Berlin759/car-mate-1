$(document).ready(function () {
    fetchAllCarOwnerList();
    initOwnerPhoneValidation();
});

$(document).on("keypress", "#addCarOwnerModal input, #addCarOwnerModal select", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        if (!$("#addCarOwnerModal #add_car_owner").hasClass("d-none")) {
            $("#addCarOwnerModal #add_car_owner").trigger("click");
        } else if (!$("#addCarOwnerModal #update_car_owner").hasClass("d-none")) {
            $("#addCarOwnerModal #update_car_owner").trigger("click");
        };
    };
});

function initOwnerPhoneValidation() {
    const $phoneCode = $("#addCarOwnerModal #phone_code");
    const $phoneNumber = $("#addCarOwnerModal #phone_number");

    function updatePhoneMaxLength() {
        const maxLen = $phoneCode.find(":selected").data("max-length") || 10;
        $phoneNumber.attr("maxlength", maxLen);
        if ($phoneNumber.val().length > maxLen) {
            $phoneNumber.val($phoneNumber.val().slice(0, maxLen));
        };
    };

    $phoneCode.on("change", updatePhoneMaxLength);
    updatePhoneMaxLength();

    $phoneNumber.on("input", function () {
        this.value = this.value.replace(/[^0-9]/g, "");
        const maxLen = $phoneCode.find(":selected").data("max-length") || 10;
        if (this.value.length > maxLen) {
            this.value = this.value.slice(0, maxLen);
        };
    });

    $("#addCarOwnerModal #full_name").on("input", function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");
    });
};

// Email Filter Object
$(document).on("input", "#email-filter-input", function () {
    let email = $("#email-filter-input").val();
    email = email.trim();
    if (email.length > 0) {
        $("#apply-email-filter").removeClass("btn-disabled");
        $("#clear-email-filter").removeClass("d-none");
    } else {
        $("#apply-email-filter").addClass("btn-disabled");
        $("#clear-email-filter").addClass("d-none");
    };
});

$(document).on("click", "#apply-email-filter", function () {
    const email = $("#email-filter-input").val()?.trim();
    let displayEmail = email.length > 15 ? email.substring(0, 15) + "..." : email;

    $("#email-filter-btn .filter-data").text(displayEmail).addClass("active");
    $("#email-filter-btn .hr-line-sm").addClass("active");
    $("#clear-email-filter").removeClass("d-none");

    fetchAllCarOwnerList({ email: email });
});

$(document).on('keypress', '#email-filter-input', function (e) {
    if (e.key === "Enter") {
        const email = $("#email-filter-input").val()?.trim();
        if (email) {
            $('#apply-email-filter').click();
        } else {
            $('#clear-email-filter').click();
        }
    }
});

$(document).on("click", "#clear-email-filter", function () {
    $("#email-filter-input").val("");

    $("#apply-email-filter").addClass("btn-disabled");
    $("#email-filter-btn .filter-data").text("").removeClass("active");
    $("#email-filter-btn .hr-line-sm").removeClass("active");
    $("#clear-email-filter").addClass("d-none");

    fetchAllCarOwnerList({ email: "" });
});

// Status Filter Object
$(document).on("click", ".car-owner-status-filter", function () {
    const status = $(this).data('status');
    const statusText = $(this).data('status-text');

    $("#clear-status-filter").removeClass("d-none");
    $("#status-filter-btn .filter-data").text(statusText).addClass("active");
    $("#status-filter-btn .hr-line-sm").addClass("active");

    fetchAllCarOwnerList({ status: status });
});

$(document).on("click", "#clear-status-filter", function () {
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllCarOwnerList({ status: "" });
});

$(document).on("click", "#reset-car-owner-filters", function () {
    $("#reset-car-owner-filters").addClass("d-none");

    // Email
    $("#email-filter-input").val("");
    $("#apply-email-filter").addClass("btn-disabled");
    $("#email-filter-btn .filter-data").text("").removeClass("active");
    $("#email-filter-btn .hr-line-sm").removeClass("active");
    $("#clear-email-filter").addClass("d-none");

    // Status
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllCarOwnerList({ status: "", email: "" });
});

$(document).on("click", ".car_owner_delete", function () {
    const ownerId = $(this).data("car-owner-id");
    if (!ownerId) {
        showToast(0, "Invalid car owner Id");
        return;
    };

    postAjaxCall("/car-owner-delete", { ownerId: ownerId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            fetchAllCarOwnerList();
        };
    });
});

$(document).on("hide.bs.modal", "#addCarOwnerModal", function (e) {
    resetAddCarOwnerModal();
});

$(document).on("click", "#add_new_car_owner", function () {
    $("#addCarOwnerModal #add_car_owner").removeClass("d-none");
    $("#addCarOwnerModal #update_car_owner").addClass("d-none");
    $("#addCarOwnerModal #addCarOwnerModalLabel").text("Add Car Owner");
});

$(document).on("click", "#add_car_owner", function () {
    const full_name = $("#addCarOwnerModal #full_name").val();
    const phone_code = $("#addCarOwnerModal #phone_code").val();
    const phone_number = $("#addCarOwnerModal #phone_number").val();

    const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;

    const nameRegex = /^[a-zA-Z\s]+$/;

    let validationMessage = "";
    if (!full_name) {
        validationMessage = "Owner name is required. Please enter owner name.";
    } else if (full_name && full_name.trim().length < 2) {
        validationMessage = "Owner name minimum 2 characters.";
    } else if (full_name && !nameRegex.test(full_name.trim())) {
        validationMessage = "Owner name must contain only alphabetic characters and spaces.";
    } else if (!phone_number) {
        validationMessage = "Phone number is required. Please enter phone number.";
    } else if (phone_number && !regex.test(phone_number)) {
        validationMessage = "Please enter a valid phone number. Ensure it follows the correct format.";
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    const payload = {
        fullName: full_name.trim(),
        phoneCode: phone_code,
        phoneNumber: phone_number,
    };

    postAjaxCall("/add-owner", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#addCarOwnerModal").modal("hide");
            fetchAllCarOwnerList();
        } else if (response.flag === 8) {
            window.location.reload();
        };
    });
});

$(document).on("click", ".edit-car-owner-button", function () {
    const ownerId = $(this).data("car-owner-id");
    const car_owner_status = $(this).data("car-owner-status");

    const data = { ownerId: ownerId };

    postAjaxCall("/car-owner-details", data, function (response) {
        if (response.flag === 1) {
            const carOwnerDetails = response.data.carOwnerDetails;

            $("#addCarOwnerModal").modal("show");
            $("#addCarOwnerModal #add_car_owner").addClass("d-none");
            $("#addCarOwnerModal #update_car_owner").removeClass("d-none");
            $("#addCarOwnerModal #addCarOwnerModalLabel").text("Update Car Owner");

            $("#addCarOwnerModal #car_owner_id").val(carOwnerDetails._id);
            $("#addCarOwnerModal #full_name").val(carOwnerDetails.fullName);
            if (carOwnerDetails.phoneCode) {
                $("#addCarOwnerModal #phone_code").val(carOwnerDetails.phoneCode);
            };
            $("#addCarOwnerModal #phone_number").val(carOwnerDetails.phoneNumber);
        } else if (response.flag === 8) {
            window.location.reload();
        } else if (response.flag === 0) {
            showToast(response.flag, response.msg);
            return;
        };
    });
});

$(document).on("click", "#update_car_owner", function () {
    const car_owner_id = $("#addCarOwnerModal #car_owner_id").val();
    const full_name = $("#addCarOwnerModal #full_name").val();
    const phone_code = $("#addCarOwnerModal #phone_code").val();
    const phone_number = $("#addCarOwnerModal #phone_number").val();

    const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;
    const nameRegex = /^[a-zA-Z\s]+$/;

    let validationMessage = "";
    if (!car_owner_id) {
        validationMessage = "Invalid owner id.";
    } else if (!full_name) {
        validationMessage = "Owner name is required. Please enter owner name.";
    } else if (full_name && full_name.trim().length < 2) {
        validationMessage = "Owner name minimum 2 characters.";
    } else if (full_name && !nameRegex.test(full_name.trim())) {
        validationMessage = "Owner name must contain only alphabetic characters and spaces.";
    } else if (!phone_number) {
        validationMessage = "Phone number is required. Please enter phone number.";
    } else if (phone_number && !regex.test(phone_number)) {
        validationMessage = "Please enter a valid phone number. Ensure it follows the correct format.";
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    const payload = {
        ownerId: car_owner_id,
        fullName: full_name.trim(),
        phoneCode: phone_code,
        phoneNumber: phone_number,
    };

    postAjaxCall("/update-owner", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#addCarOwnerModal").modal("hide");

            fetchAllCarOwnerList();
        } else if (response.flag === 8) {
            window.location.reload();
        };
    });
});

function resetAddCarOwnerModal() {
    $("#addCarOwnerModal #car_owner_id").val("");
    $("#addCarOwnerModal #full_name").val("");
    $("#addCarOwnerModal #phone_code").val("+91");
    $("#addCarOwnerModal #phone_number").val("");
    $("#addCarOwnerModal #phone_number").attr("maxlength", "10");
};

function fetchAllCarOwnerList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/car-owner-list", "car-owner-list-table-data");
    toggleResetButtonVisibility("#reset-car-owner-filters", "#car-owner-filter-section");
};