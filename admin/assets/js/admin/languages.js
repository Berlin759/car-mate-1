$(document).ready(function () {
    fetchLanguageList();
    initLanguageValidation();
});

$(document).on("hide.bs.modal", "#languageModal", function () {
    resetLanguageModal();
});

$(document).on("click", "#add_new_language_btn", function () {
    resetLanguageModal();
});

$(document).on("click", "#save_language", function () {
    const name = $("#language_name").val().trim();
    const nativeName = $("#language_native_name").val().trim();
    const languageCode = $("#language_code").val().trim();

    const nameRegex = /^[a-zA-Z\s]+$/;

    let validationMessage = "";
    if (!name) {
        validationMessage = "Language name is required.";
    } else if (!nameRegex.test(name)) {
        validationMessage = "Language name must contain only alphabetic characters and spaces.";
    } else if (!nativeName) {
        validationMessage = "Language native name is required.";
    } else if (!nameRegex.test(nativeName)) {
        validationMessage = "Language native name must contain only alphabetic characters and spaces.";
    } else if (!languageCode) {
        validationMessage = "Language language code is required.";
    } else if (!nameRegex.test(languageCode)) {
        validationMessage = "Language language code must contain only alphabetic characters and spaces.";
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    const payload = {
        name: name,
        nativeName: nativeName,
        languageCode: languageCode,
    };

    postAjaxCall("/add-language", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#languageModal").modal("hide");
            fetchLanguageList();
        };
    });
});

$(document).on("click", ".edit-language", function () {
    const languageId = $(this).data("language-id");
    if (!languageId) {
        showToast(0, "Invalid Language ID");
        return;
    };

    postAjaxCall("/language-details", { languageId: languageId }, function (response) {
        if (response.flag !== 1) {
            showToast(response.flag, response.msg);
            return;
        };

        const lang = response.data;

        resetLanguageModal();

        $("#languageModalLabel").text("Edit Language");
        $("#save_language").addClass("d-none");
        $("#update_language").removeClass("d-none");

        $("#language_id").val(lang._id);
        $("#language_name").val(lang.name);
        $("#language_native_name").val(lang.nativeName);
        $("#language_code").val(lang.languageCode);

        $("#languageModal").modal("show");
    });
});

$(document).on("click", "#update_language", function () {
    const languageId = $("#language_id").val();
    const name = $("#language_name").val().trim();
    const nativeName = $("#language_native_name").val().trim();
    const languageCode = $("#language_code").val().trim();

    const nameRegex = /^[a-zA-Z\s]+$/;

    let validationMessage = "";
    if (!languageId) {
        validationMessage = "Language id is required.";
    } else if (!name) {
        validationMessage = "Language name is required.";
    } else if (!nameRegex.test(name)) {
        validationMessage = "Language name must contain only alphabetic characters and spaces.";
    } else if (!nativeName) {
        validationMessage = "Language native name is required.";
    } else if (!nameRegex.test(nativeName)) {
        validationMessage = "Language native name must contain only alphabetic characters and spaces.";
    } else if (!languageCode) {
        validationMessage = "Language language code is required.";
    } else if (!nameRegex.test(languageCode)) {
        validationMessage = "Language language code must contain only alphabetic characters and spaces.";
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    const payload = {
        languageId: languageId,
        name: name,
        nativeName: nativeName,
        languageCode: languageCode,
    };

    postAjaxCall("/update-language", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#languageModal").modal("hide");
            fetchLanguageList();
        };
    });
});

$(document).on("click", ".delete-language", function () {
    const languageId = $(this).data("language-id");
    if (!languageId) {
        showToast(0, "Invalid Language ID");
        return;
    };

    if (!confirm("Are you sure you want to delete this template?")) return;

    postAjaxCall("/delete-language", { languageId: languageId }, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            fetchLanguageList();
        };
    });
});

$(document).on("change", ".language-status-select", function () {
    const languageId = $(this).data("language-id");
    const isActive = $(this).val();

    if (!languageId) {
        showToast(0, "Invalid Language ID");
        return;
    };

    postAjaxCall("/toggle-language-status", { languageId: languageId, isActive: isActive }, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            fetchLanguageList();
        };
    });
});

function fetchLanguageList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/language-list", "language-list-table-data");
};

function initLanguageValidation() {
    $(document).on("input", "#language_name", function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");
    });

    $(document).on("input", "#language_native_name", function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");
    });

    $(document).on("input", "#language_code", function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");
    });

    $(document).on("keypress", "#languageModal input", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            $("#save_language").trigger("click");
        };
    });
};

// Reset modal
function resetLanguageModal() {
    $("#language_id").val("");
    $("#language_name").val("");
    $("#language_native_name").val("");
    $("#language_code").val("");

    $("#languageModalLabel").text("Add Language");
    $("#save_language").removeClass("d-none");
    $("#update_language").addClass("d-none");
};