const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
var filter_url = "";
var filters = {
    totalItems: 0,
    itemPerPage: 10,
    currentPage: 1,
    totalPages: 1,
    timeZone: userTimeZone,
};
var multipleFilter = [];
var div_id = "";

$(document).ready(function () {
    $("#recordPerPage").val(filters.itemPerPage);
    $("#status_search").trigger("focus");

    $(document).on("click", ".page_no", function () {
        var cp = $(this).data("page");
        var table = $(this).data("table");

        filters.currentPage = cp;
        var furl = multipleFilter[table]["filter_url"];
        filterData(furl, table);
    });
});

$(document).on("click", ".ti-copy", function (e) {
    e.preventDefault();
    const tx = $(this).data("copy");
    if (!tx) {
        return;
    };

    const $temp = $("<input>");
    $("body").append($temp);
    $temp.val(tx).select();

    document.execCommand("copy");
    $temp.remove();

    $(this).removeClass('ti-copy').addClass('ti-check');

    setTimeout(() => {
        $(this).removeClass('ti-check').addClass('ti-copy');
    }, 1000);
});

$(document).on("click", ".ti-modal-copy", function (e) {
    e.preventDefault();
    const tx = $(this).data("copy");
    if (!tx) {
        return;
    };

    const $temp = $("<input>");
    $("#inv-details-modal").append($temp);
    $temp.val(tx).select();

    document.execCommand("copy");
    $temp.remove();

    $(this).removeClass('ti-copy').addClass('ti-check');

    setTimeout(() => {
        $(this).removeClass('ti-check').addClass('ti-copy');
    }, 1000);
});

function changeRecordPerPage(url, table) {
    var id = "";
    if (typeof table !== "undefined") {
        id = "-" + table;
    };

    var recPp = $("#recordPerPage" + id).val();
    if (isNaN(recPp)) {
        showToast(0, "Please select valid page limit");
        return false;
    } else if (recPp == "") {
        filters.itemPerPage = 10;
        $("#recordPerPage").val(10);
    } else if (recPp < 1) {
        showToast(0, "Please select valid page limit");
        return false;
    } else {
        filters.itemPerPage = recPp;
    };

    filters.currentPage = 1;

    if (typeof table === "undefined") {
        table = "table-data";
    };

    filterData(url, table);
};

async function filterData(url, table) {
    $(".search_btn_show").attr("disabled", true);

    if (typeof table === "undefined") {
        table = "table-data";
    };

    var flush = 1;
    if (typeof multipleFilter[table] !== "undefined" && typeof multipleFilter[table]["filters"] !== "undefined") {
        flush = 0;
        $.each(multipleFilter[table]["filters"], function (k, v) {
            if (typeof filters[k] === "undefined") {
                filters[k] = v;
            };
        });
    } else {
        multipleFilter[table] = {};
    };

    var jdata = filters;
    filter_url = url;
    $(".pagination").addClass("btn-disabled");
    $(".pagination li").addClass("btn-disabled");

    await $.ajax({
        type: "POST",
        url: url,
        data: JSON.stringify(jdata),
        dataType: "json",
        contentType: "application/json",
        success: function (res) {
            if (res.flag === 0) {
                filters.totalItems = 0;
                filters.totalPages = 0;
                $("#" + table).html("");
                $(".pagination").html("");
            } else {
                $("#" + table).html(res.blade);
                filters.totalItems = res["total_record"];

                if (filters.totalItems <= 10) {
                    $("#recordPerPage").addClass("d-none");
                    $(".pagination-area").addClass("d-none");
                    $("#pagination-div-" + table).addClass("d-none");
                } else {
                    $(".pagination-area").removeClass("d-none");
                    $("#recordPerPage").removeClass("d-none");
                    $("#pagination-div-" + table).removeClass("d-none");
                };

                filters.totalPages = filters.totalItems > 0 ? Math.ceil(filters.totalItems / filters.itemPerPage) : 0;
                if (filters.totalPages > 0) {
                    $("#pagination-div").removeClass("d-none");
                    setPagination(table);
                } else {
                    $("#pagination-div").addClass("d-none");
                    $(".pagination").html("");
                };

                setTimeout(() => {
                    $('[data-bs-toggle="tooltip"]').each(function () {
                        new bootstrap.Tooltip(this, {
                            trigger: 'hover'
                        });
                    });
                }, 500);
            };

            if (res["is_filter_visible"] == 0) {
                $(`#${table}-list-pagination`).addClass("d-none");
            } else {
                $(`#${table}-list-pagination`).removeClass("d-none");
            };

            $(".pagination").removeClass("btn-disabled");
            $(".pagination li a").removeClass("btn-disabled");
            $("#search_option_bet").removeClass("btn-disabled");
            $("#wizard-next").removeClass("btn-disabled");

            multipleFilter[table]["filters"] = filters;
            multipleFilter[table]["filter_url"] = filter_url;
            flushFilters(flush);
            $(".search_btn_show").attr("disabled", false);
        },
    }).fail(function () {
        $(".pagination li a").removeClass("btn-disabled");
    });
};

function setFilters(searchObject, removeField) {
    filters = { ...filters, ...searchObject };

    if (removeField) {
        filters[removeField] = "";
    };

    filters.currentPage = 1;
};

function resetFilters(searchObject, table) {
    if (typeof table !== "undefined" && typeof multipleFilter[table] !== "undefined") {
        multipleFilter[table]["filters"] = filters;
    };

    filters = { ...filters, ...searchObject };
    filters.currentPage = 1;

    if (filters?.multiselect?.length == 0) {
        delete filters.multiselect;
    };
};

function flushFilters(keep) {
    if (keep) {
        filters = {
            totalItems: 0,
            itemPerPage: filters.itemPerPage,
            currentPage: 1,
            totalPages: 1,
        };
    } else {
        filters = {};
    };
};

function paginationInput(e, cp, tp, table) {
    let newPage = $(e.target).val();
    if (!newPage) return false;

    newPage = Number(newPage);
    const currentPage = Number(cp);
    const totalPage = Number(tp);

    if (Number.isNaN(newPage) || Number.isNaN(totalPage) || newPage <= 0 || newPage > totalPage) {
        $(e.target).val(currentPage);
        return;
    };

    filters.currentPage = newPage;
    var furl = multipleFilter[table]["filter_url"];
    filterData(furl, table);
};

function setPagination(table) {
    var tp = filters.totalPages;
    var cp = filters.currentPage;
    var p = prevPage(cp, tp, 0);
    var li = "";

    var fl =
        '<li class="page-item"><a class="page-link page_no" data-page="' +
        1 +
        '"  data-table="' +
        table +
        '" data-type="f"><svg width="9" height="8" viewBox="0 0 9 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.27344 7.5L4.77344 4L8.27344 0.5" stroke="#171D25" stroke-linecap="round" stroke-linejoin="round" /><path d="M4.1875 7.5L0.6875 4L4.1875 0.5" stroke="#171D25" stroke-linecap="round" stroke-linejoin="round" /></svg></a></li>';

    var ll =
        '<li class="page-item"><a data-page="' +
        tp +
        '" data-type="l" data-table="' +
        table +
        '" class="page-link page_no"><svg width="10" height="9" viewBox="0 0 10 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.960938 8.44824L4.50793 4.99588L1.05557 1.44888" stroke="#171D25" stroke-linecap="round" stroke-linejoin="round" /><path d="M5.04688 8.50391L8.59387 5.05154L5.14151 1.50455" stroke="#171D25" stroke-linecap="round" stroke-linejoin="round" /></svg></a></li>';

    var pp =
        '<li class="page-item"><a data-page="' +
        p +
        '" data-type="p"  data-table="' +
        table +
        '" class="page-link page_no"><svg width="5" height="8" viewBox="0 0 5 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.22656 7.5L0.726562 4L4.22656 0.5" stroke="#171D25" stroke-linecap="round" stroke-linejoin="round" /></svg></a></li>';

    var p = prevPage(cp, tp, 1);

    var np =
        '<li class="page-item"><a data-page="' +
        p +
        '" data-type="n"  data-table="' +
        table +
        '" class="page-link page_no"><svg width="5" height="8" viewBox="0 0 5 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.84375 7.5L4.34375 4L0.84375 0.5" stroke="#171D25" stroke-linecap="round" stroke-linejoin="round" /></svg></a></li>';

    var ns = "";
    var ps = "";

    li +=
        '<li class="page-item active"><div data-table="' +
        table +
        `" class="d-flex justify-content-center align-items-center i--pagination text-center btn-disabled page-input"><input type="text" class="form-control shadow-none px-0 text-center pagination-input" value="${cp}" min="1" max="${tp}" onchange="paginationInput(event, ${cp}, ${tp}, '${table}')" style="width: 20px;"><div class="p-divider">/</div><div class="ps-2">${tp}</div></div></li>`;

    li = fl + pp + ps + li + ns + np + ll;
    var cls1 = "";
    var cls2 = "";
    if ($(".pagination").hasClass(table)) {
        cls1 = "." + table;
        cls2 = "." + table;
    };

    $(cls1 + ".pagination").html(li);

    $(cls1 + " .page_no").each(function () {
        var tp = $(this).data("type");
        if (tp == cp) {
            $(this).addClass("active");
        };
    });

    let id = "";
    if (table !== "table-data") {
        id = "-" + table;
    };

    $("#recordPerPage" + id)
        .find("option[value='" + filters.itemPerPage + "']")
        .attr("selected", true);

    if (cp == 1) {
        $(cls2 + ".pagination li:first-child")
            .removeClass("page_no")
            .addClass("btn-disabled");
        $(cls2 + ".pagination li:nth-child(2)")
            .removeClass("page_no")
            .addClass("btn-disabled");
    };

    if (cp == tp) {
        $(cls2 + ".pagination li:last-child")
            .removeClass("page_no")
            .addClass("btn-disabled");
        $(cls2 + ".pagination li:nth-last-child(2)")
            .removeClass("page_no")
            .addClass("btn-disabled");
        $(cls2 + ".pagination li .pagination-div-tag").addClass("btn-disabled");
    };
};

function prevPage(cp, tp, t) {
    var p = 1;
    if (t) {
        p = cp + 1 < tp ? cp + 1 : tp > 0 ? tp : 1;
    } else {
        p = cp - 1 > 0 ? cp - 1 : 1;
    };

    return p;
};

function nextDigit(cp, tp, t) {
    if (t) {
        for (i = cp; i <= tp; i++) {
            if (i % 7 == 0) {
                return i;
            };
        };
        return tp;
    } else {
        for (i = cp; i > 0; i--) {
            if (i % 7 == 0) {
                return i;
            };
        };
        return 1;
    };
};

function showToast(flag, val, time) {
    $("#toast").remove();
    if (!val) return;

    var notiHtml = document.createElement("div");
    var att = document.createAttribute("id");
    att.value = "toast";
    notiHtml.setAttributeNode(att);

    if (flag == 1) {
        notiHtml.className = "notification is-success";
    } else if (flag == 0 || flag == 2) {
        notiHtml.className = "notification is-error";
    } else {
        notiHtml.className = "notification is-warning";
    };

    $("body").append(notiHtml);
    $(notiHtml).html(val);

    if (typeof time === "undefined" || time == null) {
        time = 5000;
    };

    setTimeout(function () {
        $("#toast").remove();
        time = null;
    }, time);
};

function AjaxCall(url, callback, method = "GET") {
    $.ajax({
        type: method.toUpperCase(),
        url,
        success: function (response) {
            if (response?.flag === 8) {
                window.location.reload();
            } else {
                callback(response);
            };
        },
        error: function (err) {
            console.error("Error:", err);
        },
    });
};

function postAjaxCall(url, data, callback) {
    $.ajax({
        url: url,
        type: "POST",
        data: data,
        success: function (response) {
            if (response?.flag === 8) {
                window.location.reload();
            } else {
                callback(response);
            };
        },
    });
};

function postFileCall(url, formData, callback) {
    $.ajax({
        type: "POST",
        url: url,
        data: formData,
        contentType: false,
        processData: false,
        success: function (response) {
            if (response?.flag === 8) {
                window.location.reload();
            } else {
                callback(response);
            };
        },
        error: function (err) {
            console.error("Error:", err);
        },
    });
};

function DateInHumanReadableFormat(date) {
    let currentDate = moment.utc();
    const formattedCurrentDatetime = currentDate.toISOString();
    currentDate = moment(formattedCurrentDatetime).utc();
    const targetDate = moment(date).utc();
    const secondDifference = currentDate.diff(targetDate, "seconds");
    if (secondDifference < 60) {
        return `${secondDifference} ${"seconds ago"}`;
    } else if (secondDifference > 60 && secondDifference < 3600) {
        const minDifference = Math.floor(secondDifference / 60);
        return `${minDifference} ${"minutes ago"}`;
    } else if (secondDifference > 3600 && secondDifference < 86400) {
        const hourDifference = Math.floor(secondDifference / 3600);
        return `${hourDifference} ${"hours ago"}`;
    } else if (secondDifference > 86400 && secondDifference < 604800) {
        const dayDifference = Math.floor(secondDifference / 86400);
        return `${dayDifference} ${"days ago"}`;
    } else if (secondDifference > 604800 && secondDifference < 2592000) {
        const weeksDifference = Math.floor(secondDifference / 604800);
        return `${weeksDifference} ${weeksDifference > 1 ? `${"weeks"}` : `${"week"}`} ${"ago"}`;
    } else if (secondDifference > 2592000 && secondDifference < 31104000) {
        const yearDifference = Math.floor(secondDifference / 2592000);
        return `${yearDifference} ${yearDifference > 1 ? `${"month"}` : `${"months"}`} ${"ago"}`;
    } else if (secondDifference > 31104000) {
        const yearDifference = Math.floor(secondDifference / 31104000);
        return `${yearDifference} ${yearDifference > 1 ? `${"year"}` : `${"years"}`} ${"ago"}`;
    } else {
        const monthsDifference = Math.floor(secondDifference / 30);
        return `${monthsDifference} ${monthsDifference > 1 ? `${"months"}` : `${"month"}`} ${"ago"}`;
    };
};

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};