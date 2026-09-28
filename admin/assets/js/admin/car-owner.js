$(document).ready(function () {
    fetchAllCarOwnerList();
    initOwnerPhoneValidation();
});

$(document).on("keypress", "#addOwnerModal input, #addOwnerModal select", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        if (!$("#addOwnerModal #add_owner").hasClass("d-none")) {
            $("#addOwnerModal #add_owner").trigger("click");
        } else if (!$("#addOwnerModal #update_owner").hasClass("d-none")) {
            $("#addOwnerModal #update_owner").trigger("click");
        };
    };
});

function initOwnerPhoneValidation() {
    const $phoneCode = $("#addOwnerModal #phone_code");
    const $phoneNumber = $("#addOwnerModal #phone_number");

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

    $("#addOwnerModal #full_name").on("input", function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");
    });
};

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

    // Status
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllCarOwnerList({ status: "" });
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

$(document).on("hide.bs.modal", "#addOwnerModal", function (e) {
    resetAddOwnerModal();
});

$(document).on("click", "#add_new_owner", function () {
    $("#addOwnerModal #add_owner").removeClass("d-none");
    $("#addOwnerModal #update_owner").addClass("d-none");
    $("#addOwnerModal #addOwnerModalLabel").text("Add Owner");
});

$(document).on("click", "#add_owner", function () {
    const full_name = $("#addOwnerModal #full_name").val();
    const phone_code = $("#addOwnerModal #phone_code").val();
    const phone_number = $("#addOwnerModal #phone_number").val();

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
            $("#addOwnerModal").modal("hide");
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

            $("#addOwnerModal").modal("show");
            $("#addOwnerModal #add_owner").addClass("d-none");
            $("#addOwnerModal #update_owner").removeClass("d-none");
            $("#addOwnerModal #addOwnerModalLabel").text("Update Owner");

            $("#addOwnerModal #car_owner_id").val(carOwnerDetails._id);
            $("#addOwnerModal #full_name").val(carOwnerDetails.fullName);
            if (carOwnerDetails.phoneCode) {
                $("#addOwnerModal #phone_code").val(carOwnerDetails.phoneCode);
            };
            $("#addOwnerModal #phone_number").val(carOwnerDetails.phoneNumber);
        } else if (response.flag === 8) {
            window.location.reload();
        } else if (response.flag === 0) {
            showToast(response.flag, response.msg);
            return;
        };
    });
});

$(document).on("click", "#update_owner", function () {
    const car_owner_id = $("#addOwnerModal #car_owner_id").val();
    const full_name = $("#addOwnerModal #full_name").val();
    const phone_code = $("#addOwnerModal #phone_code").val();
    const phone_number = $("#addOwnerModal #phone_number").val();

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
            $("#addOwnerModal").modal("hide");

            fetchAllCarOwnerList();
        } else if (response.flag === 8) {
            window.location.reload();
        };
    });
});

function resetAddOwnerModal() {
    $("#addOwnerModal #car_owner_id").val("");
    $("#addOwnerModal #full_name").val("");
    $("#addOwnerModal #phone_code").val("+91");
    $("#addOwnerModal #phone_number").val("");
    $("#addOwnerModal #phone_number").attr("maxlength", "10");
};

function fetchAllCarOwnerList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/car-owner-list", "car-owner-list-table-data");
    toggleResetButtonVisibility("#reset-car-owner-filters", "#car-owner-filter-section");
};