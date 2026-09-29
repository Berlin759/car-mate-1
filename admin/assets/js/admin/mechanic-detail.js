$(document).ready(function () { });

$(document).on("click", "#update-mechanic-status", function () {
    const mechanicId = $("#mechanic-id").val();
    const status = $("#mechanic-status-select").val();

    if (!mechanicId) {
        showToast(0, "Invalid mechanic Id");
        return;
    };

    if (!status) {
        showToast(0, "Please select a status.");
        return;
    };

    const payload = {
        mechanicId: mechanicId,
        status: parseInt(status),
    };

    postAjaxCall("/suspend-mechanic", payload, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 8) {
            window.location.reload();
        };
    });
});

$(document).on("click", ".delete-service-subcategory", function () {
    const serviceId = $(this).data("service-id");
    const subCategoryId = $(this).data("subcategory-id");
    const subCategoryName = $(this).data("subcategory-name");
    const subCategoryPrice = $(this).data("subcategory-price");

    $("#delete-service-id").val(serviceId);
    $("#delete-subcategory-id").val(subCategoryId);
    $("#delete-subcategory-name").text(subCategoryName || "-");
    $("#delete-subcategory-price").text(subCategoryPrice || 0);

    $("#deleteServiceSubCategoryModal").modal("show");
});

$(document).on("click", "#confirm-delete-service-subcategory", function () {
    const button = $(this);

    const mechanicId = $("#mechanic-id").val();
    const serviceId = $("#delete-service-id").val();
    const subCategoryId = $("#delete-subcategory-id").val();

    let validationMessage = "";
    if (!serviceId) {
        validationMessage = "Invalid service id.";
    } else if (subCategoryId === "") {
        validationMessage = "Invalid subCategory index.";
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    button.prop("disabled", true);

    const originalHtml = button.html();

    button.html(`
        <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
        Deleting...
    `);

    const payload = {
        mechanicId: mechanicId,
        serviceId: serviceId,
        subCategoryId: subCategoryId,
    };

    postAjaxCall("/remove-mechanic-service", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 0) {
            button.prop("disabled", false);
            button.html(originalHtml);
        } else {
            $("#deleteServiceSubCategoryModal").modal("hide");

            setTimeout(function () {
                window.location.reload();
            }, 500);
        };
    });
});