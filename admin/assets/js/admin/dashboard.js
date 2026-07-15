$(document).ready(function () { });

const bookingCtx = document.getElementById('bookingChart');

new Chart(bookingCtx, {
    type: 'line',
    data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [{
            label: 'Bookings',
            data: [65, 78, 90, 80, 95, 110, 130],
            borderColor: '#ff7a18',
            backgroundColor: 'rgba(255,122,24,0.15)',
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { display: false }
        }
    }
});


// Revenue Chart

const revenueCtx = document.getElementById('revenueChart');

new Chart(revenueCtx, {
    type: 'bar',
    data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [{
            label: 'Revenue',
            data: [12000, 15000, 18000, 16000, 21000, 25000, 30000],
            backgroundColor: '#3b82f6',
            borderRadius: 6
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { display: false }
        }
    }
});