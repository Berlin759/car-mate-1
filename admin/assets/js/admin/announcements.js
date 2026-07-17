$(document).ready(function () {
    fetchAnnouncementList();
});

$(document).on("click", "#save_announcement", function () {
    const title = $("#announcement_title").val().trim();
    const description = $("#announcement_description").val().trim();
    const targetRole = $("#announcement_target").val();

    if (!title || !description) {
        showToast(0, "Title and description are required.");
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
            $("#announcement_title").val("");
            $("#announcement_description").val("");
            $("#announcement_target").val("all");
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

function fetchAnnouncementList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/announcement-list", "announcement-list-table-data");
    toggleResetButtonVisibility("#reset-announcement-filters", "#announcement-filter-section");
};