$(document).ready(function () {
    fetchAllCarsList();
});

// Status Filter Object
$(document).on("click", ".car-status-filter", function () {
    const status = $(this).data('status');
    const statusText = $(this).data('status-text');

    $("#clear-status-filter").removeClass("d-none");
    $("#status-filter-btn .filter-data").text(statusText).addClass("active");
    $("#status-filter-btn .hr-line-sm").addClass("active");

    fetchAllCarsList({ status: status });
});

$(document).on("click", "#clear-status-filter", function () {
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllCarsList({ status: "" });
});

$(document).on("click", "#reset-car-filters", function () {
    $("#reset-car-filters").addClass("d-none");

    // Status
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllCarsList({ status: "", email: "" });
});

$(document).on("click", ".car_delete", function () {
    const carId = $(this).data("car-id");
    if (!carId) {
        showToast(0, "Invalid car Id");
        return;
    };

    postAjaxCall("/car-delete", { carId: carId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            filterData("/car-list", "car-list-table-data");
        };
    });
});

$(document).on("hide.bs.modal", "#addCarModal", function (e) {
    resetAddCarModal();
});

$(document).on("click", "#add_new_car", function () {
    $("#addCarModal #add_car").removeClass("d-none");
    $("#addCarModal #update_car").addClass("d-none");
    $("#addCarModal #addCarModalLabel").text("Add Car");
});

$(document).on("click", "#add_car", function () {
    const vehicle_number = $("#addCarModal #vehicle_number").val();

    let validationMessage = "";
    if (!vehicle_number) {
        validationMessage = "Vehicle number is required. Please enter car name.";
    } else if (vehicle_number && vehicle_number.length < 3) {
        validationMessage = "Vehicle number minimum 3 character.";
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    const payload = {
        vehicle_number: vehicle_number,
    };

    postAjaxCall("/add-car", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#addCarModal").modal("hide");
            fetchAllCarsList();
        } else if (response.flag === 8) {
            window.location.reload();
        };
    });
});

$(document).on("click", ".edit-car-button", function () {
    const carId = $(this).data("car-id");
    const car_status = $(this).data("car-status");

    const data = { carId: carId };

    postAjaxCall("/car-details", data, function (response) {
        if (response.flag === 1) {
            const carDetails = response.data.carDetails;

            $("#addCarModal").modal("show");
            $("#addCarModal #add_car").addClass("d-none");
            $("#addCarModal #update_car").removeClass("d-none");
            $("#addCarModal #addCarModalLabel").text("Update Car");

            $("#addCarModal #car_id").val(carDetails._id);
            $("#addCarModal #vehicle_number").val(carDetails.fullName);
        } else if (response.flag === 8) {
            window.location.reload();
        } else if (response.flag === 0) {
            showToast(response.flag, response.msg);
            return;
        };
    });
});

$(document).on("click", "#update_car", function () {
    const carId = $("#addCarModal #car_id").val();
    const vehicle_number = $("#addCarModal #vehicle_number").val();

    let validationMessage = "";
    if (!carId) {
        validationMessage = "Invalid car id.";
    } else if (!vehicle_number && vehicle_number.length < 3) {
        validationMessage = "Car name is required. Please enter car name.";
    } else if (vehicle_number && vehicle_number.length < 3) {
        validationMessage = "Car name minimum 3 character.";
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    const payload = {
        carId: carId,
        vehicle_number: vehicle_number,
    };

    postAjaxCall("/car-update", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#addCarModal").modal("hide");

            fetchAllCarsList();
        } else if (response.flag === 8) {
            window.location.reload();
        };
    });
});

function resetAddCarModal() {
    $("#addCarModal #car_id").val("");
    $("#addCarModal #vehicle_number").val("");
};

function fetchAllCarsList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/car-list", "car-list-table-data");
    toggleResetButtonVisibility("#reset-car-filters", "#car-filter-section");
};