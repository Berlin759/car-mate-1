$(document).ready(function () {
    fetchAllMechanicList();
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

    fetchAllMechanicList({ status: "", email: "" });
});

$(document).on("click", ".mechanic_details_show", function () {
    return;
    const mechanicId = $(this).data("mechanic-id");
    if (!mechanicId) {
        showToast(0, "Invalid mechanic Id");
        return;
    };

    /* RESET OLD DATA */
    $("#mechanic_details_body #mechanic_trx").text("-");
    $("#mechanic_details_body #mechanic_guest_name").text("-");
    $("#mechanic_details_body #mechanic_check_in").text("-");
    $("#mechanic_details_body #mechanic_check_out").text("-");
    $("#mechanic_details_body #mechanic_status").text("-");
    $("#mechanic_details_body #mechanic_trx_status").text("-");

    postAjaxCall("/mechanic-details", { mechanicId: mechanicId }, function (response) {
        if (response.flag !== 1) {
            showToast(response.flag, response.msg);
            return;
        };

        const result = response.data;

        /* Mechanic STATUS */
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
        $("#mechanic_details_body #mechanic_trx").text(result?._id || "-");
        $("#mechanic_details_body #mechanic_guest_name").text(result?.mechanicDetails?.fullName || "-");
        $("#mechanic_details_body #mechanic_check_in").text(formatDate(result?.checkIn) || "-");
        $("#mechanic_details_body #mechanic_check_out").text(formatDate(result?.checkOut) || "-");

        $("#mechanic_status")
            .text(statusText)
            .removeClass("alert-success alert-danger")
            .addClass(statusClass);

        $("#mechanic_trx_status")
            .text(statusTrxText)
            .removeClass("alert-success alert-danger")
            .addClass(statusTrxClass);

        /* OPEN MODAL */
        $("#mechanic_detail_modal").modal("show");
    });
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
    const phone_number = $("#addMechanicModal #phone_number").val();

    const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;

    let validationMessage = "";
    if (!full_name) {
        validationMessage = "Mechanic name is required. Please enter mechanic name.";
    } else if (full_name && full_name.length < 3) {
        validationMessage = "Mechanic name minimum 3 character.";
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
    const phone_number = $("#addMechanicModal #phone_number").val();

    let validationMessage = "";
    if (!mechanicId) {
        validationMessage = "Invalid mechanic id.";
    } else if (!full_name && full_name.length < 3) {
        validationMessage = "Mechanic name is required. Please enter mechanic name.";
    } else if (full_name && full_name.length < 3) {
        validationMessage = "Mechanic name minimum 3 character.";
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
        fullName: full_name,
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
    $("#addMechanicModal #phone_number").val("");
};

function fetchAllMechanicList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/mechanic-list", "mechanic-list-table-data");
    toggleResetButtonVisibility("#reset-mechanic-filters", "#mechanic-filter-section");
};