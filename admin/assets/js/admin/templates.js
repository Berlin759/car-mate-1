var templatePlaceholders = [];

$(document).ready(function () {
    fetchTemplateList();
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
        }
    });
});

// Toggle subject field based on type
$(document).on("change", "#template_type", function () {
    if ($(this).val() === "email") {
        $("#subject-field-group").show();
    } else {
        $("#subject-field-group").hide();
        $("#template_subject").val("");
    }
});

// Placeholders
$(document).on("click", "#add_placeholder_btn", function () {
    addPlaceholder();
});

$(document).on("keypress", "#placeholder_input", function (e) {
    if (e.which === 13) {
        e.preventDefault();
        addPlaceholder();
    }
});

$(document).on("click", ".remove-placeholder-tag", function () {
    const val = $(this).data("placeholder");
    templatePlaceholders = templatePlaceholders.filter((p) => p !== val);
    renderPlaceholderTags();
});

$(document).on("hide.bs.modal", "#templateModal", function () {
    resetTemplateModal();
});

$(document).on("click", "#add_new_template_btn", function () {
    resetTemplateModal();
});

// Save Template
$(document).on("click", "#save_template", function () {
    const name = $("#template_name").val().trim();
    const type = $("#template_type").val();
    const subject = $("#template_subject").val().trim();
    const body = $("#template_body").val().trim();
    const targetAudience = $("#template_audience").val();

    if (!name) { showToast(0, "Template name is required."); return; }
    if (!body) { showToast(0, "Template body is required."); return; }
    if (type === "email" && !subject) { showToast(0, "Subject is required for email templates."); return; }

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
        }
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
        }

        resetTemplateModal();
        $("#template_id").val(t._id);
        $("#template_name").val(t.name).prop("disabled", true);
        $("#template_type").val(t.type);
        $("#template_subject").val(t.subject || "");
        $("#template_body").val(t.body || "");
        $("#template_audience").val(t.targetAudience || "all");
        templatePlaceholders = t.placeholders || [];
        renderPlaceholderTags();

        if (t.type !== "email") {
            $("#subject-field-group").hide();
        }

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

    if (!body) { showToast(0, "Template body is required."); return; }
    if (type === "email" && !subject) { showToast(0, "Subject is required for email templates."); return; }

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
        }
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
        }

        if (t.isActive) {
            $("#view-template-active").removeClass("d-none");
            $("#view-template-inactive").addClass("d-none");
        } else {
            $("#view-template-active").addClass("d-none");
            $("#view-template-inactive").removeClass("d-none");
        }

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
        }
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
        }
    });
});

function fetchTemplateList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/template-list", "template-list-table-data");
    toggleResetButtonVisibility("#reset-template-filters", "#template-filter-section");
};

function addPlaceholder() {
    const val = $("#placeholder_input").val().trim();
    if (!val) return;

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

    templatePlaceholders = [];

    renderPlaceholderTags();

    $("#subject-field-group").show();
    $("#templateModalLabel").text("Add Template");
    $("#save_template").removeClass("d-none");
    $("#update_template").addClass("d-none");
};