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

    fetchAllServicesList({ status: "", mechanicId: filters.mechanicId || "" });
});

// Mechanic Filter
$(document).on("click", ".mechanic-filter", function () {
    const mechanicId = $(this).data('mechanic-id');
    const mechanicName = $(this).data('mechanic-name');

    $("#clear-mechanic-filter").removeClass("d-none");
    $("#mechanic-filter-btn .filter-data").text(mechanicName).addClass("active");
    $("#mechanic-filter-btn .hr-line-sm").addClass("active");

    fetchAllServicesList({ mechanicId: mechanicId, status: filters.status || "" });
});

$(document).on("click", "#clear-mechanic-filter", function () {
    $("#clear-mechanic-filter").addClass("d-none");
    $("#mechanic-filter-btn .filter-data").text("").removeClass("active");
    $("#mechanic-filter-btn .hr-line-sm").removeClass("active");

    fetchAllServicesList({ mechanicId: "", status: filters.status || "" });
});

$(document).on("click", "#reset-service-filters", function () {
    $("#reset-service-filters").addClass("d-none");

    // Status
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    // Mechanic
    $("#clear-mechanic-filter").addClass("d-none");
    $("#mechanic-filter-btn .filter-data").text("").removeClass("active");
    $("#mechanic-filter-btn .hr-line-sm").removeClass("active");

    fetchAllServicesList({ status: "", mechanicId: "" });
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
    $("#subcategory_list_container").empty();
    addSubcategoryRow();
});

$(document).on("click", "#add_subcategory_row_btn", function () {
    addSubcategoryRow();
});

$(document).on("click", ".remove-subcategory-row-btn", function () {
    $(this).closest(".subcategory-row").remove();
});

$(document).on("click", "#add_service", function () {
    const full_name = $("#addServiceModal #service_name").val().trim();
    const description = $("#addServiceModal #service_description").val().trim();

    let validationMessage = "";
    if (!full_name) {
        validationMessage = "Category name is required.";
    } else if (full_name.length < 3) {
        validationMessage = "Category name must be at least 3 characters.";
    } else if (!description) {
        validationMessage = "Category description is required.";
    }

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    }

    const subCategories = [];
    let subValidationMessage = "";
    $("#subcategory_list_container .subcategory-row").each(function (index) {
        const name = $(this).find(".subcategory-name").val().trim();

        if (!name) {
            subValidationMessage = `Sub-category #${index + 1} Name is required.`;
            return false;
        }
        subCategories.push({ fullName: name });
    });

    if (subValidationMessage !== "") {
        showToast(0, subValidationMessage);
        return;
    }

    if (subCategories.length === 0) {
        showToast(0, "Please add at least one sub-category.");
        return;
    }

    const payload = {
        fullName: full_name,
        description: description,
        subCategories: subCategories
    };

    postAjaxCall("/add-service", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#addServiceModal").modal("hide");
            fetchAllServicesList();
        } else if (response.flag === 8) {
            window.location.reload();
        }
    });
});

$(document).on("click", ".edit-service-button", function () {
    const serviceId = $(this).data("service-id");
    const data = { serviceId: serviceId };

    postAjaxCall("/service-details", data, function (response) {
        if (response.flag === 1) {
            const serviceDetails = response.data.serviceDetails;
            const subCategories = response.data.subCategories || [];

            $("#addServiceModal").modal("show");
            $("#addServiceModal #add_service").addClass("d-none");
            $("#addServiceModal #update_service").removeClass("d-none");
            $("#addServiceModal #addServiceModalLabel").text("Update Service");

            $("#addServiceModal #service_id").val(serviceDetails._id);
            $("#addServiceModal #service_name").val(serviceDetails.fullName);
            $("#addServiceModal #service_description").val(serviceDetails.description);

            $("#subcategory_list_container").empty();
            if (subCategories.length > 0) {
                subCategories.forEach(sub => {
                    addSubcategoryRow(sub._id, sub.fullName);
                });
            } else {
                addSubcategoryRow();
            }
        } else if (response.flag === 8) {
            window.location.reload();
        } else if (response.flag === 0) {
            showToast(response.flag, response.msg);
            return;
        }
    });
});

$(document).on("click", "#update_service", function () {
    const serviceId = $("#addServiceModal #service_id").val();
    const full_name = $("#addServiceModal #service_name").val().trim();
    const description = $("#addServiceModal #service_description").val().trim();

    let validationMessage = "";
    if (!serviceId) {
        validationMessage = "Invalid service id.";
    } else if (!full_name) {
        validationMessage = "Category name is required.";
    } else if (full_name.length < 3) {
        validationMessage = "Category name must be at least 3 characters.";
    } else if (!description) {
        validationMessage = "Category description is required.";
    }

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    }

    const subCategories = [];
    let subValidationMessage = "";
    $("#subcategory_list_container .subcategory-row").each(function (index) {
        const id = $(this).find(".subcategory-id").val();
        const name = $(this).find(".subcategory-name").val().trim();

        if (!name) {
            subValidationMessage = `Sub-category #${index + 1} Name is required.`;
            return false;
        }
        subCategories.push({ _id: id || undefined, fullName: name });
    });

    if (subValidationMessage !== "") {
        showToast(0, subValidationMessage);
        return;
    }

    if (subCategories.length === 0) {
        showToast(0, "Please add at least one sub-category.");
        return;
    }

    const payload = {
        serviceId: serviceId,
        fullName: full_name,
        description: description,
        subCategories: subCategories
    };

    postAjaxCall("/service-update", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#addServiceModal").modal("hide");
            fetchAllServicesList();
        } else if (response.flag === 8) {
            window.location.reload();
        }
    });
});

function resetAddServiceModal() {
    $("#addServiceModal #service_id").val("");
    $("#addServiceModal #service_name").val("");
    $("#addServiceModal #service_description").val("");
    $("#subcategory_list_container").empty();
}

function fetchAllServicesList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/service-list", "service-list-table-data");
    toggleResetButtonVisibility("#reset-service-filters", "#service-filter-section");
};

function addSubcategoryRow(id = "", name = "") {
    const rowHtml = `
        <div class="subcategory-row p-3 border rounded bg-light position-relative">
            <input type="hidden" class="subcategory-id" value="${id}" />
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fs-12 fw-semibold text-secondary">Sub-category</span>
                <button type="button" class="btn btn-sm text-danger remove-subcategory-row-btn p-0 border-0 bg-transparent fs-12">
                    <i class="fa-solid fa-trash-can"></i> Remove
                </button>
            </div>
            <div class="row g-2">
                <div class="col-md-12">
                    <input class="form-control form-control-sm subcategory-name" type="text" placeholder="Enter Sub-category Name" value="${name}">
                </div>
            </div>
        </div>
    `;

    $("#subcategory_list_container").append(rowHtml);
};