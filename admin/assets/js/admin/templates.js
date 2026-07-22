var templatePlaceholders = [];

$(document).ready(function () {
    fetchTemplateList();
    initTemplateValidation();
});

$(document).on("hide.bs.modal", "#templateModal", function () {
    resetTemplateModal();
});

$(document).on("click", "#add_new_template_btn", function () {
    resetTemplateModal();
});

// Type Filter
$(document).on("click", ".template-type-filter", function () {
    const type = $(this).data("type");
    const typeText = $(this).data("type-text");
    $("#clear-type-filter").removeClass("d-none");
    $("#type-filter-btn .filter-data").text(typeText).addClass("active");
    $("#type-filter-btn .hr-line-sm").addClass("active");
    fetchTemplateList({ type: type });
});

$(document).on("click", "#clear-type-filter", function () {
    $("#clear-type-filter").addClass("d-none");
    $("#type-filter-btn .filter-data").text("").removeClass("active");
    $("#type-filter-btn .hr-line-sm").removeClass("active");
    fetchTemplateList({ type: "" });
});

$(document).on("click", "#reset-template-filters", function () {
    $("#reset-template-filters").addClass("d-none");
    $("#clear-type-filter").addClass("d-none");
    $("#type-filter-btn .filter-data").text("").removeClass("active");
    $("#type-filter-btn .hr-line-sm").removeClass("active");
    fetchTemplateList({ type: "" });
});

// Seed Default Templates
$(document).on("click", "#seed-default-templates-btn", function () {
    postAjaxCall("/seed-default-templates", {}, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            fetchTemplateList();
        };
    });
});

// Toggle subject field based on type
$(document).on("change", "#template_type", function () {
    if ($(this).val() === "email") {
        $("#subject-field-group").show();
    } else {
        $("#subject-field-group").hide();
        $("#template_subject").val("");
        $("#template_subject_counter").text("0/50");
    };
});

// Placeholders
$(document).on("click", "#add_placeholder_btn", function () {
    addPlaceholder();
});

$(document).on("keypress", "#placeholder_input", function (e) {
    if (e.which === 13) {
        e.preventDefault();
        addPlaceholder();
    };
});

$(document).on("input", "#placeholder_input", function () {
    this.value = this.value.replace(/[^a-zA-Z]/g, "");
});

$(document).on("click", ".remove-placeholder-tag", function () {
    const val = $(this).data("placeholder");
    templatePlaceholders = templatePlaceholders.filter((p) => p !== val);
    renderPlaceholderTags();
});

// Save Template
$(document).on("click", "#save_template", function () {
    const name = $("#template_name").val().trim();
    const type = $("#template_type").val();
    const subject = $("#template_subject").val().trim();
    const body = $("#template_body").val().trim();
    const targetAudience = $("#template_audience").val();

    const nameRegex = /^[a-zA-Z\s]+$/;
    const bodyRegex = /^[a-zA-Z0-9\s.,!?:;\-\{\}]+$/;
    const nameNoSpace = name.replace(/\s/g, "");
    const subjectNoSpace = subject.replace(/\s/g, "");
    const bodyNoSpace = body.replace(/\s/g, "");

    let validationMessage = "";
    if (!name) {
        validationMessage = "Template name is required.";
    } else if (!nameRegex.test(name)) {
        validationMessage = "Template name must contain only alphabetic characters and spaces.";
    } else if (nameNoSpace.length > 50) {
        validationMessage = "Template name must not exceed 50 characters (excluding spaces).";
    } else if (!body) {
        validationMessage = "Template body is required.";
    } else if (!bodyRegex.test(body)) {
        validationMessage = "Template body must not contain special characters.";
    } else if (bodyNoSpace.length > 300) {
        validationMessage = "Template body must not exceed 300 characters (excluding spaces).";
    } else if (type === "email" && !subject) {
        validationMessage = "Subject is required for email templates.";
    } else if (type === "email" && !nameRegex.test(subject)) {
        validationMessage = "Subject must contain only alphabetic characters and spaces.";
    } else if (type === "email" && subjectNoSpace.length > 50) {
        validationMessage = "Subject must not exceed 50 characters (excluding spaces).";
    } else if (templatePlaceholders.length === 0) {
        validationMessage = "At least one placeholder is required.";
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    postAjaxCall("/add-template", {
        name: name,
        type: type,
        subject: subject,
        body: body,
        targetAudience: targetAudience,
        placeholders: templatePlaceholders,
    }, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#templateModal").modal("hide");
            fetchTemplateList();
        };
    });
});

// Edit Template
$(document).on("click", ".edit-template-btn", function () {
    const templateId = $(this).data("template-id");
    if (!templateId) { showToast(0, "Invalid template ID"); return; }

    postAjaxCall("/template-details", { templateId: templateId }, function (response) {
        if (response.flag !== 1) { showToast(response.flag, response.msg); return; }
        const t = response.data;

        if (t.isDefault) {
            showToast(0, "Default templates cannot be edited.");
            return;
        };

        resetTemplateModal();
        $("#template_id").val(t._id);
        $("#template_name").val(t.name).prop("disabled", true);
        $("#template_type").val(t.type);
        $("#template_subject").val(t.subject || "");
        $("#template_body").val(t.body || "");
        $("#template_audience").val(t.targetAudience || "all");
        templatePlaceholders = t.placeholders || [];
        renderPlaceholderTags();

        const nameNoSpace = (t.name || "").replace(/\s/g, "");
        $("#template_name_counter").text(`${nameNoSpace.length}/50`);

        const subjectNoSpace = (t.subject || "").replace(/\s/g, "");
        $("#template_subject_counter").text(`${subjectNoSpace.length}/50`);

        const bodyNoSpace = (t.body || "").replace(/\s/g, "");
        $("#template_body_counter").text(`${bodyNoSpace.length}/300`);

        if (t.type !== "email") {
            $("#subject-field-group").hide();
        };

        $("#templateModalLabel").text("Edit Template");
        $("#save_template").addClass("d-none");
        $("#update_template").removeClass("d-none");
        $("#templateModal").modal("show");
    });
});

// Update Template
$(document).on("click", "#update_template", function () {
    const templateId = $("#template_id").val();
    const subject = $("#template_subject").val().trim();
    const body = $("#template_body").val().trim();
    const type = $("#template_type").val();
    const targetAudience = $("#template_audience").val();

    const nameRegex = /^[a-zA-Z\s]+$/;
    const bodyRegex = /^[a-zA-Z0-9\s.,!?:;\-\{\}]+$/;
    const subjectNoSpace = subject.replace(/\s/g, "");
    const bodyNoSpace = body.replace(/\s/g, "");

    let validationMessage = "";
    if (!body) {
        validationMessage = "Template body is required.";
    } else if (!bodyRegex.test(body)) {
        validationMessage = "Template body must not contain special characters.";
    } else if (bodyNoSpace.length > 300) {
        validationMessage = "Template body must not exceed 300 characters (excluding spaces).";
    } else if (!type) {
        validationMessage = "Template type is required.";
    } else if (type === "email" && !subject) {
        validationMessage = "Subject is required for email templates.";
    } else if (type === "email" && !nameRegex.test(subject)) {
        validationMessage = "Subject must contain only alphabetic characters and spaces.";
    } else if (type === "email" && subjectNoSpace.length > 50) {
        validationMessage = "Subject must not exceed 50 characters (excluding spaces).";
    } else if (!targetAudience) {
        validationMessage = "Target audience is required.";
    } else if (!templatePlaceholders || templatePlaceholders.length === 0) {
        validationMessage = "At least one placeholder is required.";
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    postAjaxCall("/update-template", {
        templateId: templateId,
        subject: subject,
        body: body,
        type: type,
        targetAudience: targetAudience,
        placeholders: templatePlaceholders,
    }, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#templateModal").modal("hide");
            fetchTemplateList();
        };
    });
});

// View Template
$(document).on("click", ".view-template-btn", function () {
    const templateId = $(this).data("template-id");
    if (!templateId) { showToast(0, "Invalid template ID"); return; }

    postAjaxCall("/template-details", { templateId: templateId }, function (response) {
        if (response.flag !== 1) { showToast(response.flag, response.msg); return; }
        const t = response.data;

        $("#view-template-name").text(t.name || "-");
        $("#view-template-type").text(t.type || "-");
        $("#view-template-audience").text(t.targetAudience || "all");
        $("#view-template-subject").text(t.subject || "-");
        $("#view-template-body").text(t.body || "-");

        if (t.type !== "email") {
            $("#view-subject-group").hide();
        } else {
            $("#view-subject-group").show();
        };

        if (t.isActive) {
            $("#view-template-active").removeClass("d-none");
            $("#view-template-inactive").addClass("d-none");
        } else {
            $("#view-template-active").addClass("d-none");
            $("#view-template-inactive").removeClass("d-none");
        };

        let phHtml = "";
        (t.placeholders || []).forEach(function (p) {
            phHtml += '<span class="badge bg-info text-dark">{{' + p + "}}</span>";
        });

        $("#view-template-placeholders").html(phHtml || '<span class="text-muted">None</span>');

        $("#viewTemplateModal").modal("show");
    });
});

// Toggle Status
$(document).on("click", ".toggle-template-status", function () {
    const templateId = $(this).data("template-id");
    if (!templateId) { showToast(0, "Invalid template ID"); return; }

    postAjaxCall("/toggle-template-status", { templateId: templateId }, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            fetchTemplateList();
        };
    });
});

// Delete Template
$(document).on("click", ".delete-template-btn", function () {
    const templateId = $(this).data("template-id");
    if (!templateId) { showToast(0, "Invalid template ID"); return; }

    if (!confirm("Are you sure you want to delete this template?")) return;

    postAjaxCall("/delete-template", { templateId: templateId }, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            fetchTemplateList();
        };
    });
});

function initTemplateValidation() {
    $(document).on("input", "#template_name", function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");
        const nameNoSpace = this.value.replace(/\s/g, "");

        $("#template_name_counter").text(`${nameNoSpace.length}/50`);

        if (nameNoSpace.length > 50) {
            let trimmed = this.value;

            while (trimmed.replace(/\s/g, "").length > 50) {
                trimmed = trimmed.slice(0, -1);
            };

            this.value = trimmed;

            $("#template_name_counter").text(`50/50`);
        };
    });

    $(document).on("input", "#template_subject", function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");

        const subjectNoSpace = this.value.replace(/\s/g, "");
        $("#template_subject_counter").text(`${subjectNoSpace.length}/50`);

        if (subjectNoSpace.length > 50) {
            let trimmed = this.value;

            while (trimmed.replace(/\s/g, "").length > 50) {
                trimmed = trimmed.slice(0, -1);
            };

            this.value = trimmed;

            $("#template_subject_counter").text(`50/50`);
        };
    });

    $(document).on("input", "#template_body", function () {
        this.value = this.value.replace(/[^a-zA-Z0-9\s.,!?:;\-{}\n\r]/g, "");

        const bodyNoSpace = this.value.replace(/\s/g, "");
        $("#template_body_counter").text(`${bodyNoSpace.length}/300`);

        if (bodyNoSpace.length > 300) {
            let trimmed = this.value;

            while (trimmed.replace(/\s/g, "").length > 300) {
                trimmed = trimmed.slice(0, -1);
            };

            this.value = trimmed;

            $("#template_body_counter").text(`300/300`);
        };
    });

    $(document).on("keypress", "#templateModal input, #templateModal textarea, #templateModal select", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();

            if (!$("#save_template").hasClass("d-none")) {
                $("#save_template").trigger("click");
            } else if (!$("#update_template").hasClass("d-none")) {
                $("#update_template").trigger("click");
            };
        };
    });
};

function fetchTemplateList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/template-list", "template-list-table-data");
    toggleResetButtonVisibility("#reset-template-filters", "#template-filter-section");
};

function addPlaceholder() {
    const val = $("#placeholder_input").val().trim();
    if (!val) return;

    const nameRegex = /^[a-zA-Z]+$/;
    if (!nameRegex.test(val)) {
        showToast(0, "Placeholder must contain only alphabetic characters.");
        return;
    };

    if (val.length > 50) {
        showToast(0, "Placeholder must not exceed 50 characters.");
        return;
    };

    if (templatePlaceholders.includes(val)) {
        showToast(0, "Placeholder already added.");
        return;
    };

    templatePlaceholders.push(val);

    renderPlaceholderTags();

    $("#placeholder_input").val("");
};

function renderPlaceholderTags() {
    let html = "";

    templatePlaceholders.forEach(function (p) {
        html += '<span class="badge bg-secondary d-flex align-items-center gap-1">' + p + ' <i class="fa-solid fa-xmark cursor-pointer remove-placeholder-tag" data-placeholder="' + p + '"></i></span>';
    });

    $("#placeholder-tags-container").html(html);
};

// Reset modal
function resetTemplateModal() {
    $("#template_id").val("");
    $("#template_name").val("").prop("disabled", false);
    $("#template_type").val("email");
    $("#template_subject").val("");
    $("#template_body").val("");
    $("#template_audience").val("all");
    $("#template_name_counter").text("0/50");
    $("#template_subject_counter").text("0/50");
    $("#template_body_counter").text("0/300");

    templatePlaceholders = [];

    renderPlaceholderTags();

    $("#subject-field-group").show();
    $("#templateModalLabel").text("Add Template");
    $("#save_template").removeClass("d-none");
    $("#update_template").addClass("d-none");
};
