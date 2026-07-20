import PDFDocument from "pdfkit";

const COLORS = {
    primary: "#1a73e8",
    dark: "#202124",
    gray: "#5f6368",
    lightGray: "#e8eaed",
    white: "#ffffff",
    success: "#0d904f",
    danger: "#d93025",
    warning: "#f9ab00",
    pending: "#ea8600",
};

const STATUS_MAP = {
    1: { text: "Pending", color: COLORS.pending },
    2: { text: "Completed", color: COLORS.success },
    3: { text: "Failed", color: COLORS.danger },
    4: { text: "Refunded", color: COLORS.warning },
};

function formatDate(date) {
    if (!date) return "-";

    const d = new Date(date);
    const day = ("0" + d.getDate()).slice(-2);
    const month = ("0" + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();

    return `${year}-${month}-${day}`;
};

function drawField(doc, label, value, x, y) {
    doc.fontSize(8).fillColor(COLORS.gray).font("Helvetica").text(label, x, y);
    doc.fontSize(9).fillColor(COLORS.dark).font("Helvetica-Bold").text(String(value || "-"), x, y + 11);
};

export function generateTransactionPDF(transaction, res) {
    const doc = new PDFDocument({ size: "A4", margin: 0 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="transaction-${transaction?._id || "receipt"}.pdf"`
    );

    doc.pipe(res);

    const ML = 50;
    const MR = 50;
    const CW = doc.page.width - ML - MR;
    const status = STATUS_MAP[transaction?.status] || STATUS_MAP[1];

    // Header background
    doc.rect(0, 0, doc.page.width, 70).fill(COLORS.primary);
    doc.fontSize(18).fillColor(COLORS.white).font("Helvetica-Bold").text("Transaction Receipt", ML, 18, { width: CW, align: "center" });
    doc.fontSize(10).fillColor(COLORS.white).font("Helvetica").text(`Status: ${status.text}`, ML, 46, { width: CW, align: "center" });

    let y = 85;

    // Helper: draw a section with title and content callback
    function section(title, drawFn) {
        doc.fontSize(10).fillColor(COLORS.primary).font("Helvetica-Bold").text(title, ML, y);
        y += 14;
        doc.moveTo(ML, y).lineTo(doc.page.width - MR, y).strokeColor(COLORS.lightGray).lineWidth(0.5).stroke();
        y += 8;
        drawFn();
        y += 6;
    };

    // Transaction Info
    section("Transaction Information", () => {
        drawField(doc, "Transaction ID:", transaction?._id, ML, y);
        drawField(doc, "Invoice ID:", transaction?.invoiceId, 320, y);
        y += 28;

        drawField(doc, "TRX ID:", transaction?.trxId, ML, y);
        drawField(doc, "Created Date:", formatDate(transaction?.createdAt), 320, y);
        y += 28;

        drawField(doc, "Admin Charge:", `$${transaction?.adminCharge || 0}`, ML, y);
        drawField(doc, "Total Amount:", `$${transaction?.totalAmount || 0}`, 320, y);
        y += 28;
    });

    // Booking Info
    section("Booking Information", () => {
        drawField(doc, "Booking ID:", transaction?.bookingDetails?._id, ML, y);
        drawField(doc, "Invoice No:", transaction?.bookingDetails?.invoiceNo, 320, y);
        y += 28;

        drawField(doc, "Booking Date:", formatDate(transaction?.bookingDetails?.date), ML, y);
        drawField(doc, "Booking Time:", transaction?.bookingDetails?.time || "-", 320, y);
        y += 28;
    });

    // Car Owner
    section("Car Owner Details", () => {
        drawField(doc, "Owner Name:", transaction?.ownerDetails?.fullName, ML, y);
        drawField(doc, "Email:", transaction?.ownerDetails?.email, 320, y);
        y += 28;

        drawField(doc, "Phone:", transaction?.ownerDetails?.phoneNumber, ML, y);
        y += 28;
    });

    // Mechanic
    section("Mechanic Details", () => {
        drawField(doc, "Mechanic Name:", transaction?.mechanicDetails?.fullName, ML, y);
        drawField(doc, "Email:", transaction?.mechanicDetails?.email, 320, y);
        y += 28;

        drawField(doc, "Phone:", transaction?.mechanicDetails?.phoneNumber, ML, y);
        y += 28;
    });

    // Service & Vehicle
    section("Service & Vehicle Details", () => {
        drawField(doc, "Service Name:", transaction?.serviceDetails?.fullName, ML, y);
        drawField(doc, "Car Name:", transaction?.carDetails?.fullName, 320, y);
        y += 28;

        drawField(doc, "Vehicle Number:", transaction?.carDetails?.vehicleNumber, ML, y);
        y += 28;
    });

    // Amount Summary Box
    y += 4;
    doc.roundedRect(ML, y, CW, 55, 4).fill("#f0f4ff");
    doc.fontSize(11).fillColor(COLORS.primary).font("Helvetica-Bold").text("Amount Summary", ML + 15, y + 10);
    doc.fontSize(10).fillColor(COLORS.dark).font("Helvetica").text(`Total: $${transaction?.totalAmount || 0}`, ML + 15, y + 28);
    doc.text(`Admin Charge: $${transaction?.adminCharge || 0}`, ML + 180, y + 28);
    doc.fontSize(11).fillColor(COLORS.primary).font("Helvetica-Bold").text(`Net: $${(transaction?.totalAmount || 0) - (transaction?.adminCharge || 0)}`, ML + 360, y + 28);

    // Footer line
    doc.moveTo(ML, doc.page.height - 35).lineTo(doc.page.width - MR, doc.page.height - 35).strokeColor(COLORS.lightGray).lineWidth(0.5).stroke();
    doc.fontSize(7).fillColor(COLORS.gray).font("Helvetica").text(
        `Generated on ${formatDate(new Date())} | Car-Mate Admin`,
        ML,
        doc.page.height - 28,
        { width: CW, align: "center" },
    );

    doc.end();
};

function drawCell(doc, text, x, y, w, opts = {}) {
    const fontSize = opts.fontSize || 7;
    const color = opts.color || COLORS.dark;

    doc.save();
    doc.fontSize(fontSize).fillColor(color).font(opts.bold ? "Helvetica-Bold" : "Helvetica");
    doc.text(String(text || "-"), x + 2, y + 4, { width: w - 4, height: 12, ellipsis: true, lineBreak: false });
    doc.restore();
};

export function generateAllTransactionsPDF(transactions, res) {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="all-transactions-${formatDate(new Date())}.pdf"`
    );

    doc.pipe(res);

    const ML = 30;
    const MR = 30;
    const PW = doc.page.width;
    const USABLE_W = PW - ML - MR;

    // Header
    doc.rect(0, 0, PW, 60).fill(COLORS.primary);
    doc.fontSize(18).fillColor(COLORS.white).font("Helvetica-Bold").text("All Transactions Report", ML, 15, { width: USABLE_W, align: "center" });
    doc.fontSize(9).fillColor(COLORS.white).font("Helvetica").text(`Generated on ${formatDate(new Date())}`, ML, 38, { width: USABLE_W, align: "center" });

    let y = 72;

    // Summary
    const totalAmount = transactions.reduce((sum, t) => sum + (t?.totalAmount || 0), 0);
    const successCount = transactions.filter((t) => t?.status === 2).length;
    const failedCount = transactions.filter((t) => t?.status === 3).length;
    const refundedCount = transactions.filter((t) => t?.status === 4).length;
    const pendingCount = transactions.filter((t) => t?.status === 1).length;

    doc.fontSize(9).fillColor(COLORS.dark).font("Helvetica");
    doc.text(`Total: ${transactions.length}`, ML, y, { width: 150, lineBreak: false });
    doc.text(`Revenue: $${totalAmount.toFixed(2)}`, ML + 150, y, { width: 150, lineBreak: false });
    doc.text(`Completed: ${successCount}  |  Pending: ${pendingCount}  |  Failed: ${failedCount}  |  Refunded: ${refundedCount}`, ML + 300, y, { width: USABLE_W - 300, lineBreak: false });
    y += 18;

    // Column definitions — must sum to USABLE_W
    const headers = ["#", "Payment ID", "Booking ID", "Owner", "Mechanic", "Service", "Car", "Amount", "Admin Chg", "Status", "Date"];
    const colWidths = [25, 85, 85, 80, 80, 80, 75, 60, 60, 65, 75];
    const colX = [];
    let xAcc = ML;

    for (let i = 0; i < colWidths.length; i++) {
        colX.push(xAcc);
        xAcc += colWidths[i];
    };

    const ROW_H = 16;
    const HEADER_H = 18;

    function drawPageHeader(py) {
        doc.rect(ML, py, USABLE_W, HEADER_H).fill(COLORS.primary);
        let hx = ML;

        for (let i = 0; i < headers.length; i++) {
            doc.save();
            doc.fontSize(7).fillColor(COLORS.white).font("Helvetica-Bold");
            doc.text(headers[i], hx + 2, py + 5, { width: colWidths[i] - 4, height: 10, lineBreak: false });
            doc.restore();

            hx += colWidths[i];
        };
    };

    drawPageHeader(y);
    y += HEADER_H;

    // Table Rows
    transactions.forEach((transaction, index) => {
        if (y + ROW_H > doc.page.height - 30) {
            doc.addPage();
            doc.rect(0, 0, PW, 60).fill(COLORS.primary);
            doc.fontSize(18).fillColor(COLORS.white).font("Helvetica-Bold").text("All Transactions Report (continued)", ML, 15, { width: USABLE_W, align: "center" });
            doc.fontSize(9).fillColor(COLORS.white).font("Helvetica").text(`Page ${doc.bufferedPageRange().count + 1}`, ML, 38, { width: USABLE_W, align: "center" });
            y = 72;

            drawPageHeader(y);

            y += HEADER_H;
        };

        const bgColor = index % 2 === 0 ? COLORS.white : "#f0f4ff";
        doc.rect(ML, y, USABLE_W, ROW_H).fill(bgColor);

        // Draw cell borders
        doc.save().moveTo(ML, y).lineTo(ML + USABLE_W, y).strokeColor(COLORS.lightGray).lineWidth(0.3).stroke().restore();

        const status = STATUS_MAP[transaction?.status] || STATUS_MAP[1];

        const rowData = [
            String(index + 1),
            String(transaction?._id || "-").substring(0, 12),
            String(transaction?.bookingDetails?._id || "-").substring(0, 12),
            String(transaction?.ownerDetails?.fullName || "-").substring(0, 12),
            String(transaction?.mechanicDetails?.fullName || "-").substring(0, 12),
            String(transaction?.serviceDetails?.fullName || "-").substring(0, 12),
            String(transaction?.carDetails?.fullName || "-").substring(0, 12),
            `$${transaction?.totalAmount || 0}`,
            `$${transaction?.adminCharge || 0}`,
            status.text,
            formatDate(transaction?.createdAt),
        ];

        for (let ci = 0; ci < rowData.length; ci++) {
            if (ci === 9) {
                drawCell(doc, rowData[ci], colX[ci], y, colWidths[ci], { color: status.color, bold: true });
            } else {
                drawCell(doc, rowData[ci], colX[ci], y, colWidths[ci]);
            };
        };

        y += ROW_H;
    });

    // Bottom border
    doc.save().moveTo(ML, y).lineTo(ML + USABLE_W, y).strokeColor(COLORS.lightGray).lineWidth(0.3).stroke().restore();

    // Footer
    doc.fontSize(7).fillColor(COLORS.gray).font("Helvetica").text(
        `Car-Mate Admin | Total: ${transactions.length} transactions`,
        ML,
        doc.page.height - 20,
        { width: USABLE_W, align: "center" }
    );

    doc.end();
};