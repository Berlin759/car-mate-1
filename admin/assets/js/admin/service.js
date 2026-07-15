$(document).ready(function () {
    fetchAllServicesList();
});

// Status Filter Object
$(document).on("click", ".service-status-filter", function () {
    const status = $(this).data('status');
    const statusText = $(this).data('status-text');

    $("#clear-status-filter").removeClass("d-none");
    $("#status-filter-btn .filter-data").text(statusText).addClass("active");
    $("#status-filter-btn .hr-line-sm").addClass("active");

    fetchAllServicesList({ status: status });
});

$(document).on("click", "#clear-status-filter", function () {
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllServicesList({ status: "" });
});

$(document).on("click", "#reset-service-filters", function () {
    $("#reset-service-filters").addClass("d-none");

    // Status
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllServicesList({ status: "", email: "" });
});

$(document).on("click", ".service_details_show", function () {
    return;
    const serviceId = $(this).data("service-id");
    if (!serviceId) {
        showToast(0, "Invalid service Id");
        return;
    };

    /* RESET OLD DATA */
    $("#service_details_body #service_trx").text("-");
    $("#service_details_body #service_status").text("-");

    postAjaxCall("/service-details", { serviceId: serviceId }, function (response) {
        if (response.flag !== 1) {
            showToast(response.flag, response.msg);
            return;
        };

        const result = response.data;

        /* Service STATUS */
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

        /* SET DATA */
        $("#service_details_body #service_trx").text(result?._id || "-");

        $("#service_status")
            .text(statusText)
            .removeClass("alert-success alert-danger")
            .addClass(statusClass);

        /* OPEN MODAL */
        $("#service_detail_modal").modal("show");
    });
});

$(document).on("click", ".service_delete", function () {
    const serviceId = $(this).data("service-id");
    if (!serviceId) {
        showToast(0, "Invalid service Id");
        return;
    };

    postAjaxCall("/service-delete", { serviceId: serviceId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            filterData("/service-list", "service-list-table-data");
        };
    });
});

$(document).on("hide.bs.modal", "#addServiceModal", function (e) {
    resetAddServiceModal();
});

$(document).on("click", "#add_new_service", function () {
    $("#addServiceModal #add_service").removeClass("d-none");
    $("#addServiceModal #update_service").addClass("d-none");
    $("#addServiceModal #addServiceModalLabel").text("Add Service");
});

$(document).on("click", "#add_service", function () {
    const full_name = $("#addServiceModal #service_name").val();
    const description = $("#addServiceModal #service_description").val();

    let validationMessage = "";
    if (!full_name) {
        validationMessage = "Service name is required. Please enter service name.";
    } else if (full_name && full_name.length < 3) {
        validationMessage = "Service name minimum 3 character.";
    } else if (!description) {
        validationMessage = "Description is required. Please enter description.";
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    const payload = {
        fullName: full_name,
        description: description,
    };

    postAjaxCall("/add-service", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#addServiceModal").modal("hide");
            fetchAllServicesList();
        } else if (response.flag === 8) {
            window.location.reload();
        };
    });
});

$(document).on("click", ".edit-service-button", function () {
    const serviceId = $(this).data("service-id");
    const service_status = $(this).data("service-status");

    const data = { serviceId: serviceId };

    postAjaxCall("/service-details", data, function (response) {
        if (response.flag === 1) {
            const serviceDetails = response.data.serviceDetails;

            $("#addServiceModal").modal("show");
            $("#addServiceModal #add_service").addClass("d-none");
            $("#addServiceModal #update_service").removeClass("d-none");
            $("#addServiceModal #addServiceModalLabel").text("Update Service");

            $("#addServiceModal #service_id").val(serviceDetails._id);
            $("#addServiceModal #service_name").val(serviceDetails.fullName);
            $("#addServiceModal #service_description").val(serviceDetails.description);
        } else if (response.flag === 8) {
            window.location.reload();
        } else if (response.flag === 0) {
            showToast(response.flag, response.msg);
            return;
        };
    });
});

$(document).on("click", "#update_service", function () {
    const serviceId = $("#addServiceModal #service_id").val();
    const full_name = $("#addServiceModal #service_name").val();
    const description = $("#addServiceModal #service_description").val();

    let validationMessage = "";
    if (!serviceId) {
        validationMessage = "Invalid service id.";
    } else if (!full_name) {
        validationMessage = "Service name is required. Please enter service name.";
    } else if (full_name && full_name.length < 3) {
        validationMessage = "Service name minimum 3 character.";
    } else if (!description) {
        validationMessage = "Description is required. Please enter description.";
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    const payload = {
        serviceId: serviceId,
        fullName: full_name,
        description: description,
    };

    postAjaxCall("/service-update", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#addServiceModal").modal("hide");

            fetchAllServicesList();
        } else if (response.flag === 8) {
            window.location.reload();
        };
    });
});

function resetAddServiceModal() {
    $("#addServiceModal #service_id").val("");
    $("#addServiceModal #service_name").val("");
    $("#addServiceModal #service_description").val("");
};

function fetchAllServicesList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/service-list", "service-list-table-data");
    toggleResetButtonVisibility("#reset-service-filters", "#service-filter-section");
};