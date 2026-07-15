$(document).ready(function () {
    fetchAllCarOwnerList();
});

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

$(document).on("click", ".car_owner_details_show", function () {
    return;
    const carOwnerId = $(this).data("car-owner-id");
    if (!carOwnerId) {
        showToast(0, "Invalid car owner Id");
        return;
    };

    /* RESET OLD DATA */
    $("#car_owner_details_body #car_owner_trx").text("-");
    $("#car_owner_details_body #car_owner_guest_name").text("-");
    $("#car_owner_details_body #car_owner_check_in").text("-");
    $("#car_owner_details_body #car_owner_check_out").text("-");
    $("#car_owner_details_body #car_owner_status").text("-");
    $("#car_owner_details_body #car_owner_trx_status").text("-");

    postAjaxCall("/car-owner-details", { carOwnerId: carOwnerId }, function (response) {
        if (response.flag !== 1) {
            showToast(response.flag, response.msg);
            return;
        };

        const result = response.data;

        /* Car Owner STATUS */
        let statusText = "Active";
        let statusClass = "alert-success";

        if (parseInt(result?.status) === 1) {
            statusText = "Pending";
            statusClass = "alert-pending";
        } else if (parseInt(result?.status) === 3) {
            statusText = "In Active";
            statusClass = "alert-gray";
        } else if (parseInt(result?.status) === 4) {
            statusText = "Suspended";
            statusClass = "alert-danger";
        };

        /* PAYMENT STATUS */
        let statusTrxText = "Pending";
        let statusTrxClass = "alert-pending";

        if (parseInt(result?.transactionDetails?.status) === 2) {
            statusTrxText = "Paid";
            statusTrxClass = "alert-accept";
        } else if (parseInt(result?.transactionDetails?.status) === 3) {
            statusTrxText = "Failed";
            statusTrxClass = "alert-gray";
        } else if (parseInt(result?.transactionDetails?.status) === 4) {
            statusTrxText = "Refunded";
            statusTrxClass = "alert-end";
        };

        /* SET DATA */
        $("#car_owner_details_body #car_owner_trx").text(result?._id || "-");
        $("#car_owner_details_body #car_owner_guest_name").text(result?.ownerDetails?.fullName || "-");
        $("#car_owner_details_body #car_owner_check_in").text(formatDate(result?.checkIn) || "-");
        $("#car_owner_details_body #car_owner_check_out").text(formatDate(result?.checkOut) || "-");

        $("#car_owner_status")
            .text(statusText)
            .removeClass("alert-success alert-danger")
            .addClass(statusClass);

        $("#car_owner_trx_status")
            .text(statusTrxText)
            .removeClass("alert-success alert-danger")
            .addClass(statusTrxClass);

        /* OPEN MODAL */
        $("#car_owner_detail_modal").modal("show");
    });
});

$(document).on("click", ".car_owner_delete", function () {
    const carOwnerId = $(this).data("car-owner-id");
    if (!carOwnerId) {
        showToast(0, "Invalid car owner Id");
        return;
    };

    postAjaxCall("/car-owner-delete", { carOwnerId: carOwnerId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            filterData("/car-owner-list", "car-owner-list-table-data");
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
    const phone_number = $("#addCarOwnerModal #phone_number").val();

    const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;

    let validationMessage = "";
    if (!full_name) {
        validationMessage = "Owner name is required. Please enter owner name.";
    } else if (full_name && full_name.length < 3) {
        validationMessage = "Owner name minimum 3 character.";
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
        fullName: full_name,
        phoneNumber: phone_number,
    };

    postAjaxCall("/add-car-owner", payload, function (response) {
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
    const carOwnerId = $(this).data("car-owner-id");
    const car_owner_status = $(this).data("car-owner-status");

    const data = { carOwnerId: carOwnerId };

    postAjaxCall("/car-owner-details", data, function (response) {
        if (response.flag === 1) {
            const carOwnerDetails = response.data.carOwnerDetails;

            $("#addCarOwnerModal").modal("show");
            $("#addCarOwnerModal #add_car_owner").addClass("d-none");
            $("#addCarOwnerModal #update_car_owner").removeClass("d-none");
            $("#addCarOwnerModal #addCarOwnerModalLabel").text("Update Car Owner");

            $("#addCarOwnerModal #car_owner_id").val(carOwnerDetails._id);
            $("#addCarOwnerModal #full_name").val(carOwnerDetails.fullName);
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
    const phone_number = $("#addCarOwnerModal #phone_number").val();

    const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;

    let validationMessage = "";
    if (!car_owner_id) {
        validationMessage = "Invalid owner id.";
    } else if (!full_name) {
        validationMessage = "Owner name is required. Please enter owner name.";
    } else if (full_name && full_name.length < 3) {
        validationMessage = "Owner name minimum 3 character.";
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
        carOwnerId: car_owner_id,
        fullName: full_name,
        phoneNumber: phone_number,
    };

    postAjaxCall("/car-owner-update", payload, function (response) {
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
};

function fetchAllCarOwnerList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/car-owner-list", "car-owner-list-table-data");
    toggleResetButtonVisibility("#reset-car-owner-filters", "#car-owner-filter-section");
};