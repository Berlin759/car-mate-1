$(document).ready(function () {
    fetchAnnouncementList();
    initAnnouncementValidation();
});

$(document).on("hide.bs.modal", "#addAnnouncementModal", function () {
    $("#announcement_title").val("");
    $("#announcement_description").val("");
    $("#announcement_target").val("all");
    $("#announcement_title_counter").text("0/50");
    $("#announcement_desc_counter").text("0/200");
});

function initAnnouncementValidation() {
    $(document).on("input", "#announcement_title", function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");
        const titleNoSpace = this.value.replace(/\s/g, "");
        $("#announcement_title_counter").text(`${titleNoSpace.length}/50`);
        if (titleNoSpace.length > 50) {
            this.value = this.value.slice(0, this.value.length - (titleNoSpace.length - 50));
            $("#announcement_title_counter").text(`50/50`);
        };
    });

    $(document).on("input", "#announcement_description", function () {
        const descNoSpace = this.value.replace(/\s/g, "");
        $("#announcement_desc_counter").text(`${descNoSpace.length}/200`);
        if (descNoSpace.length > 200) {
            let trimmed = this.value;
            while (trimmed.replace(/\s/g, "").length > 200) {
                trimmed = trimmed.slice(0, -1);
            };
            this.value = trimmed;
            $("#announcement_desc_counter").text(`200/200`);
        };
    });

    $(document).on("keypress", "#addAnnouncementModal input, #addAnnouncementModal textarea, #addAnnouncementModal select", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            $("#save_announcement").trigger("click");
        };
    });
};

$(document).on("click", "#save_announcement", function () {
    const title = $("#announcement_title").val().trim();
    const description = $("#announcement_description").val().trim();
    const targetRole = $("#announcement_target").val();

    const nameRegex = /^[a-zA-Z\s]+$/;
    const titleNoSpace = title.replace(/\s/g, "");
    const descNoSpace = description.replace(/\s/g, "");

    let validationMessage = "";
    if (!title) {
        validationMessage = "Title is required.";
    } else if (!nameRegex.test(title)) {
        validationMessage = "Title must contain only alphabetic characters and spaces.";
    } else if (titleNoSpace.length > 50) {
        validationMessage = "Title must not exceed 50 characters (excluding spaces).";
    } else if (!description) {
        validationMessage = "Description is required.";
    } else if (descNoSpace.length > 200) {
        validationMessage = "Description must not exceed 200 characters (excluding spaces).";
    } else if (!targetRole) {
        validationMessage = "Target Audience is required.";
    }

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    }

    postAjaxCall("/add-announcement", {
        title: title,
        description: description,
        targetRole: targetRole,
    }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            $("#addAnnouncementModal").modal("hide");
            fetchAnnouncementList();
        }
    });
});

$(document).on("click", ".delete-announcement", function () {
    const announcementId = $(this).data("announcement-id");
    if (!announcementId) { showToast(0, "Invalid announcement ID"); return; }
    postAjaxCall("/delete-announcement", { announcementId: announcementId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) { fetchAnnouncementList(); }
    });
});

$(document).on("change", ".announcement-status-select", function () {
    const announcementId = $(this).data("announcement-id");
    const isActive = $(this).val();
    if (!announcementId) { showToast(0, "Invalid announcement ID"); return; }
    postAjaxCall("/toggle-announcement-status", { announcementId: announcementId, isActive: isActive }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) { fetchAnnouncementList(); }
    });
});

function fetchAnnouncementList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/announcement-list", "announcement-list-table-data");
    toggleResetButtonVisibility("#reset-announcement-filters", "#announcement-filter-section");
};
