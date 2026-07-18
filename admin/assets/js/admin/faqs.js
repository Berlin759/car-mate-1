$(document).ready(function () {
    fetchFaqList();
});

$(document).on("hide.bs.modal", "#addFaqModal", function () {
    $("#faq_question").val("");
    $("#faq_answer").val("");
    $("#faq_category").val("");
});

$(document).on("click", "#save_faq", function () {
    const question = $("#faq_question").val().trim();
    const answer = $("#faq_answer").val().trim();
    const category = $("#faq_category").val().trim();

    if (!question) {
        showToast(0, "Question is required.");
        return;
    };

    if (!answer) {
        showToast(0, "Answer is required.");
        return;
    };

    if (!category) {
        showToast(0, "Category is required.");
        return;
    };

    postAjaxCall("/add-faq", {
        question: question,
        answer: answer,
        category: category,
    }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            $("#addFaqModal").modal("hide");
            fetchFaqList();
        }
    });
});

$(document).on("click", ".delete-faq", function () {
    const faqId = $(this).data("faq-id");
    if (!faqId) { showToast(0, "Invalid FAQ ID"); return; }
    postAjaxCall("/delete-faq", { faqId: faqId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) { fetchFaqList(); }
    });
});

$(document).on("change", ".faq-status-select", function () {
    const faqId = $(this).data("faq-id");
    const isActive = $(this).val();
    if (!faqId) { showToast(0, "Invalid FAQ ID"); return; }
    postAjaxCall("/toggle-faq-status", { faqId: faqId, isActive: isActive }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) { fetchFaqList(); }
    });
});

function fetchFaqList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/faq-list", "faq-list-table-data");
    toggleResetButtonVisibility("#reset-faq-filters", "#faq-filter-section");
};