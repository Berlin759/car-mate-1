$(document).ready(function () {
    fetchBannerList();
});

$(document).on("click", "#save_banner", function () {
    const title = $("#banner_title").val().trim();
    const description = $("#banner_description").val().trim();
    const link = $("#banner_link").val().trim();
    const sortOrder = $("#banner_sort_order").val();

    if (!title) {
        showToast(0, "Title is required.");
        return;
    }

    postAjaxCall("/add-banner", {
        title: title,
        description: description,
        link: link,
        sortOrder: parseInt(sortOrder || 0),
    }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            $("#addBannerModal").modal("hide");
            $("#banner_title").val("");
            $("#banner_description").val("");
            $("#banner_link").val("");
            $("#banner_sort_order").val(0);
            fetchBannerList();
        }
    });
});

$(document).on("click", ".delete-banner", function () {
    const bannerId = $(this).data("banner-id");
    if (!bannerId) { showToast(0, "Invalid banner ID"); return; }
    postAjaxCall("/delete-banner", { bannerId: bannerId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) { fetchBannerList(); }
    });
});

function fetchBannerList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/banner-list", "banner-list-table-data");
    toggleResetButtonVisibility("#reset-banner-filters", "#banner-filter-section");
};