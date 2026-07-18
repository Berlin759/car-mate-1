$(document).ready(function () {
    fetchAllMechanicList();
    initMechanicPhoneValidation();
});

$(document).on("keypress", "#addMechanicModal input, #addMechanicModal select", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        if (!$("#addMechanicModal #add_mechanic").hasClass("d-none")) {
            $("#addMechanicModal #add_mechanic").trigger("click");
        } else if (!$("#addMechanicModal #update_mechanic").hasClass("d-none")) {
            $("#addMechanicModal #update_mechanic").trigger("click");
        };
    };
});

function initMechanicPhoneValidation() {
    const $phoneCode = $("#addMechanicModal #phone_code");
    const $phoneNumber = $("#addMechanicModal #phone_number");

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

    $("#addMechanicModal #full_name").on("input", function () {
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

    fetchAllMechanicList({ email: email });
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

    fetchAllMechanicList({ email: "" });
});

// Status Filter Object
$(document).on("click", ".mechanic-status-filter", function () {
    const status = $(this).data('status');
    const statusText = $(this).data('status-text');

    $("#clear-status-filter").removeClass("d-none");
    $("#status-filter-btn .filter-data").text(statusText).addClass("active");
    $("#status-filter-btn .hr-line-sm").addClass("active");

    fetchAllMechanicList({ status: status });
});

$(document).on("click", "#clear-status-filter", function () {
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllMechanicList({ status: "" });
});

// KYC Status Filter Object
$(document).on("click", ".mechanic-kyc-status-filter", function () {
    const kycStatus = $(this).data('kyc-status');
    const kycStatusText = $(this).data('kyc-status-text');

    $("#clear-kyc-status-filter").removeClass("d-none");
    $("#kyc-status-filter-btn .filter-data").text(kycStatusText).addClass("active");
    $("#kyc-status-filter-btn .hr-line-sm").addClass("active");

    fetchAllMechanicList({ kycStatus: kycStatus });
});

$(document).on("click", "#clear-kyc-status-filter", function () {
    $("#clear-kyc-status-filter").addClass("d-none");
    $("#kyc-status-filter-btn .filter-data").text("").removeClass("active");
    $("#kyc-status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllMechanicList({ kycStatus: "" });
});

$(document).on("click", "#reset-mechanic-filters", function () {
    $("#reset-mechanic-filters").addClass("d-none");

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

    // KYC Status
    $("#clear-kyc-status-filter").addClass("d-none");
    $("#kyc-status-filter-btn .filter-data").text("").removeClass("active");
    $("#kyc-status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllMechanicList({ status: "", email: "", kycStatus: "" });
});

$(document).on("click", ".mechanic_delete", function () {
    const mechanicId = $(this).data("mechanic-id");
    if (!mechanicId) {
        showToast(0, "Invalid mechanic Id");
        return;
    };

    postAjaxCall("/mechanic-delete", { mechanicId: mechanicId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            filterData("/mechanic-list", "mechanic-list-table-data");
        };
    });
});

$(document).on("hide.bs.modal", "#addMechanicModal", function (e) {
    resetAddMechanicModal();
});

$(document).on("click", "#add_new_mechanic", function () {
    $("#addMechanicModal #add_mechanic").removeClass("d-none");
    $("#addMechanicModal #update_mechanic").addClass("d-none");
    $("#addMechanicModal #addMechanicModalLabel").text("Add Mechanic");
});

$(document).on("click", "#add_mechanic", function () {
    const full_name = $("#addMechanicModal #full_name").val();
    const phone_code = $("#addMechanicModal #phone_code").val();
    const phone_number = $("#addMechanicModal #phone_number").val();

    const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;

    const nameRegex = /^[a-zA-Z\s]+$/;

    let validationMessage = "";
    if (!full_name) {
        validationMessage = "Mechanic name is required. Please enter mechanic name.";
    } else if (full_name && full_name.trim().length < 2) {
        validationMessage = "Mechanic name minimum 2 characters.";
    } else if (full_name && !nameRegex.test(full_name.trim())) {
        validationMessage = "Mechanic name must contain only alphabetic characters and spaces.";
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

    postAjaxCall("/add-mechanic", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#addMechanicModal").modal("hide");
            fetchAllMechanicList();
        } else if (response.flag === 8) {
            window.location.reload();
        };
    });
});

$(document).on("click", ".edit-mechanic-button", function () {
    const mechanicId = $(this).data("mechanic-id");
    const mechanic_status = $(this).data("mechanic-status");

    const data = { mechanicId: mechanicId };

    postAjaxCall("/mechanic-details", data, function (response) {
        if (response.flag === 1) {
            const mechanicDetails = response.data.mechanicDetails;

            $("#addMechanicModal").modal("show");
            $("#addMechanicModal #add_mechanic").addClass("d-none");
            $("#addMechanicModal #update_mechanic").removeClass("d-none");
            $("#addMechanicModal #addMechanicModalLabel").text("Update Mechanic");

            $("#addMechanicModal #mechanic_id").val(mechanicDetails._id);
            $("#addMechanicModal #full_name").val(mechanicDetails.fullName);
            if (mechanicDetails.phoneCode) {
                $("#addMechanicModal #phone_code").val(mechanicDetails.phoneCode);
            };
            $("#addMechanicModal #phone_number").val(mechanicDetails.phoneNumber);
        } else if (response.flag === 8) {
            window.location.reload();
        } else if (response.flag === 0) {
            showToast(response.flag, response.msg);
            return;
        };
    });
});

$(document).on("click", "#update_mechanic", function () {
    const mechanicId = $("#addMechanicModal #mechanic_id").val();
    const full_name = $("#addMechanicModal #full_name").val();
    const phone_code = $("#addMechanicModal #phone_code").val();
    const phone_number = $("#addMechanicModal #phone_number").val();

    const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;
    const nameRegex = /^[a-zA-Z\s]+$/;

    let validationMessage = "";
    if (!mechanicId) {
        validationMessage = "Invalid mechanic id.";
    } else if (!full_name) {
        validationMessage = "Mechanic name is required. Please enter mechanic name.";
    } else if (full_name && full_name.trim().length < 2) {
        validationMessage = "Mechanic name minimum 2 characters.";
    } else if (full_name && !nameRegex.test(full_name.trim())) {
        validationMessage = "Mechanic name must contain only alphabetic characters and spaces.";
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
        mechanicId: mechanicId,
        fullName: full_name.trim(),
        phoneCode: phone_code,
        phoneNumber: phone_number,
    };

    postAjaxCall("/mechanic-update", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#addMechanicModal").modal("hide");

            fetchAllMechanicList();
        } else if (response.flag === 8) {
            window.location.reload();
        };
    });
});

function resetAddMechanicModal() {
    $("#addMechanicModal #mechanic_id").val("");
    $("#addMechanicModal #full_name").val("");
    $("#addMechanicModal #phone_code").val("+91");
    $("#addMechanicModal #phone_number").val("");
    $("#addMechanicModal #phone_number").attr("maxlength", "10");
};

function fetchAllMechanicList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/mechanic-list", "mechanic-list-table-data");
    toggleResetButtonVisibility("#reset-mechanic-filters", "#mechanic-filter-section");
};