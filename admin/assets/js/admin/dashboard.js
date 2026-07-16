$(document).ready(function () {
    initBookingChart();
    initRevenueChart();
});

function initBookingChart() {
    var bookingCtx = document.getElementById("bookingChart");
    if (!bookingCtx) return;

    var labels = (typeof bookingLabels !== "undefined" && bookingLabels.length > 0) ? bookingLabels : ["No Data"];
    var data = (typeof bookingData !== "undefined" && bookingData.length > 0) ? bookingData : [0];

    new Chart(bookingCtx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Bookings",
                    data: data,
                    borderColor: "#ff7a18",
                    backgroundColor: "rgba(255,122,24,0.15)",
                    fill: true,
                    tension: 0.4,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                    },
                },
            },
        },
    });
}

function initRevenueChart() {
    var revenueCtx = document.getElementById("revenueChart");
    if (!revenueCtx) return;

    var labels = (typeof revenueLabels !== "undefined" && revenueLabels.length > 0) ? revenueLabels : ["No Data"];
    var data = (typeof revenueData !== "undefined" && revenueData.length > 0) ? revenueData : [0];

    new Chart(revenueCtx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Revenue",
                    data: data,
                    backgroundColor: "#3b82f6",
                    borderRadius: 6,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
            },
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
        },
    });
}
