$(document).ready(function () {
    fetchAllServicesList();
    initServiceNameValidation();
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

$(document).on("keypress", "#addServiceModal input, #addServiceModal textarea", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();

        if (!$("#addServiceModal #add_service").hasClass("d-none")) {
            $("#addServiceModal #add_service").trigger("click");
        } else if (!$("#addServiceModal #update_service").hasClass("d-none")) {
            $("#addServiceModal #update_service").trigger("click");
        };
    };
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

    const nameRegex = /^[a-zA-Z\s]+$/;
    const nameNoSpace = full_name.replace(/\s/g, "");
    const descNoSpace = description.replace(/\s/g, "");

    let validationMessage = "";
    if (!full_name) {
        validationMessage = "Category name is required.";
    } else if (full_name.length < 3) {
        validationMessage = "Category name must be at least 3 characters.";
    } else if (!nameRegex.test(full_name)) {
        validationMessage = "Category name must contain only alphabetic characters and spaces.";
    } else if (nameNoSpace.length > 50) {
        validationMessage = "Category name must not exceed 50 characters (excluding spaces).";
    } else if (!description) {
        validationMessage = "Category description is required.";
    } else if (descNoSpace.length > 200) {
        validationMessage = "Category description must not exceed 200 characters (excluding spaces).";
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    const subCategories = [];
    const subNames = [];
    let subValidationMessage = "";

    $("#subcategory_list_container .subcategory-row").each(function (index) {
        const name = $(this).find(".subcategory-name").val().trim();
        // const subDesc = $(this).find(".subcategory-description").val().trim();
        const subNameNoSpace = name.replace(/\s/g, "");
        // const subDescNoSpace = subDesc.replace(/\s/g, "");

        if (!name) {
            subValidationMessage = `Sub-category #${index + 1} Name is required.`;
            return false;
        } else if (name.length < 3) {
            subValidationMessage = `Sub-category #${index + 1} Name must be at least 3 characters.`;
            return false;
        } else if (!nameRegex.test(name)) {
            subValidationMessage = `Sub-category #${index + 1} Name must contain only alphabetic characters and spaces.`;
            return false;
        } else if (subNameNoSpace.length > 50) {
            subValidationMessage = `Sub-category #${index + 1} Name must not exceed 50 characters (excluding spaces).`;
            return false;
        };
        // else if (subDesc && subDescNoSpace.length > 200) {
        //     subValidationMessage = `Sub-category #${index + 1} Description must not exceed 200 characters (excluding spaces).`;
        //     return false;
        // };

        if (subNames.includes(name.toLowerCase())) {
            subValidationMessage = `Sub-category #${index + 1} Name "${name}" is duplicated. Please use unique sub-category names.`;
            return false;
        };

        subNames.push(name.toLowerCase());
        subCategories.push({
            fullName: name,
            // description: subDesc,
        });
    });

    if (subValidationMessage !== "") {
        showToast(0, subValidationMessage);
        return;
    };

    if (subCategories.length === 0) {
        showToast(0, "Please add at least one sub-category.");
        return;
    };

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
        };
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
                    addSubcategoryRow(sub._id, sub.fullName, sub.description || "");
                });
            } else {
                addSubcategoryRow();
            };
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
    const full_name = $("#addServiceModal #service_name").val().trim();
    const description = $("#addServiceModal #service_description").val().trim();

    const nameRegex = /^[a-zA-Z\s]+$/;
    const nameNoSpace = full_name.replace(/\s/g, "");
    const descNoSpace = description.replace(/\s/g, "");

    let validationMessage = "";
    if (!serviceId) {
        validationMessage = "Invalid service id.";
    } else if (!full_name) {
        validationMessage = "Category name is required.";
    } else if (full_name.length < 3) {
        validationMessage = "Category name must be at least 3 characters.";
    } else if (!nameRegex.test(full_name)) {
        validationMessage = "Category name must contain only alphabetic characters and spaces.";
    } else if (nameNoSpace.length > 50) {
        validationMessage = "Category name must not exceed 50 characters (excluding spaces).";
    } else if (!description) {
        validationMessage = "Category description is required.";
    } else if (descNoSpace.length > 200) {
        validationMessage = "Category description must not exceed 200 characters (excluding spaces).";
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    const subCategories = [];
    const subNames = [];
    let subValidationMessage = "";

    $("#subcategory_list_container .subcategory-row").each(function (index) {
        const id = $(this).find(".subcategory-id").val();
        const name = $(this).find(".subcategory-name").val().trim();
        // const subDesc = $(this).find(".subcategory-description").val().trim();
        const subNameNoSpace = name.replace(/\s/g, "");
        // const subDescNoSpace = subDesc.replace(/\s/g, "");

        if (!name) {
            subValidationMessage = `Sub-category #${index + 1} Name is required.`;
            return false;
        } else if (name.length < 3) {
            subValidationMessage = `Sub-category #${index + 1} Name must be at least 3 characters.`;
            return false;
        } else if (!nameRegex.test(name)) {
            subValidationMessage = `Sub-category #${index + 1} Name must contain only alphabetic characters and spaces.`;
            return false;
        } else if (subNameNoSpace.length > 50) {
            subValidationMessage = `Sub-category #${index + 1} Name must not exceed 50 characters (excluding spaces).`;
            return false;
        };
        // else if (subDesc && subDescNoSpace.length > 200) {
        //     subValidationMessage = `Sub-category #${index + 1} Description must not exceed 200 characters (excluding spaces).`;
        //     return false;
        // };

        if (subNames.includes(name.toLowerCase())) {
            subValidationMessage = `Sub-category #${index + 1} Name "${name}" is duplicated. Please use unique sub-category names.`;
            return false;
        };

        subNames.push(name.toLowerCase());
        subCategories.push({
            _id: id || undefined,
            fullName: name,
            // description: subDesc,
        });
    });

    if (subValidationMessage !== "") {
        showToast(0, subValidationMessage);
        return;
    };

    if (subCategories.length === 0) {
        showToast(0, "Please add at least one sub-category.");
        return;
    };

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
        };
    });
});

function initServiceNameValidation() {
    $(document).on("input", "#addServiceModal #service_name", function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");

        const nameNoSpace = this.value.replace(/\s/g, "");
        $("#service_name_counter").text(`${nameNoSpace.length}/50`);

        if (nameNoSpace.length > 50) {
            this.value = this.value.slice(0, this.value.length - (nameNoSpace.length - 50));
            $("#service_name_counter").text(`50/50`);
        };
    });

    $(document).on("input", "#addServiceModal #service_description", function () {
        const descNoSpace = this.value.replace(/\s/g, "");
        $("#service_description_counter").text(`${descNoSpace.length}/200`);

        if (descNoSpace.length > 200) {
            let trimmed = this.value;

            while (trimmed.replace(/\s/g, "").length > 200) {
                trimmed = trimmed.slice(0, -1);
            };

            this.value = trimmed;

            $("#service_description_counter").text(`200/200`);
        };
    });

    $(document).on("input", "#addServiceModal .subcategory-name", function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");

        const nameNoSpace = this.value.replace(/\s/g, "");
        const $counter = $(this).closest(".subcategory-row").find(".sub-name-counter");

        $counter.text(`${nameNoSpace.length}/50`);

        if (nameNoSpace.length > 50) {
            this.value = this.value.slice(0, this.value.length - (nameNoSpace.length - 50));
            $counter.text(`50/50`);
        };
    });

    $(document).on("input", "#addServiceModal .subcategory-description", function () {
        const descNoSpace = this.value.replace(/\s/g, "");

        const $counter = $(this).closest(".subcategory-row").find(".sub-desc-counter");
        $counter.text(`${descNoSpace.length}/200`);

        if (descNoSpace.length > 200) {
            let trimmed = this.value;

            while (trimmed.replace(/\s/g, "").length > 200) {
                trimmed = trimmed.slice(0, -1);
            };

            this.value = trimmed;

            $counter.text(`200/200`);
        };
    });
};

function resetAddServiceModal() {
    $("#addServiceModal #service_id").val("");
    $("#addServiceModal #service_name").val("");
    $("#addServiceModal #service_description").val("");
    $("#subcategory_list_container").empty();
};

function fetchAllServicesList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/service-list", "service-list-table-data");
    toggleResetButtonVisibility("#reset-service-filters", "#service-filter-section");
};

function addSubcategoryRow(id = "", name = "", description = "") {
    const nameNoSpace = name.replace(/\s/g, "");
    const descNoSpace = description.replace(/\s/g, "");

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
                    <label class="form-label fs-12 text-dark">Name</label>
                    <input class="form-control form-control-sm subcategory-name" type="text" placeholder="Enter Sub-category Name" value="${name}" maxlength="60" pattern="[a-zA-Z\s]+" minlength="3" title="Sub-category name must contain only alphabetic characters and spaces (min 3 characters)">
                    <div class="text-end fs-11 text-muted sub-name-counter">${nameNoSpace.length}/50</div>
                </div>
            </div>
        </div>
    `;

    // <div class="col-md-12">
    //     <label class="form-label fs-12 text-dark">Description</label>
    //     <textarea class="form-control form-control-sm subcategory-description" rows="2" placeholder="Enter Sub-category Description" maxlength="250">${description}</textarea>
    //     <div class="text-end fs-11 text-muted sub-desc-counter">${descNoSpace.length}/200</div>
    // </div>

    $("#subcategory_list_container").append(rowHtml);
};