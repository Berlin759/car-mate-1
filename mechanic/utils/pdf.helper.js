import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const __dirname = path.resolve();

const COLORS = {
    primary: "#FF6F3C",
    dark: "#333333",
    gray: "#888888",
    lightGray: "#eeeeee",
    white: "#ffffff",
    red: "#d93025",
};

function formatDate(date) {
    if (!date) return "-";

    const d = new Date(date);
    const day = ("0" + d.getDate()).slice(-2);

    const month = ("0" + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
};

export const generateInvoicePDF = async (booking, subTotal) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: "A4", margin: 0 });

            const folder = "upload_invoice";
            const rootDir = path.join(__dirname, "..");
            const invoiceDir = path.join(rootDir, "uploads", folder);

            if (!fs.existsSync(invoiceDir)) {
                fs.mkdirSync(invoiceDir, { recursive: true });
            };

            const fileName = `invoice-${booking.invoiceNo || booking._id}-${Date.now()}.pdf`;
            const filePath = path.join(invoiceDir, fileName);

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            const ML = 50;
            const MR = 50;
            const CW = doc.page.width - ML - MR;

            doc.rect(0, 0, doc.page.width, 70).fill(COLORS.primary);
            doc.fontSize(22).fillColor(COLORS.white).font("Helvetica-Bold").text("CAR-MATE", ML, 18, { width: CW, align: "left" });
            doc.fontSize(20).fillColor(COLORS.white).font("Helvetica-Bold").text("INVOICE", ML, 46, { width: CW, align: "right" });

            let y = 85;

            doc.fontSize(10).fillColor(COLORS.dark).font("Helvetica");
            doc.text(`Invoice No: ${booking.invoiceNo || "N/A"}`, ML, y);
            doc.text(`Date: ${formatDate(booking.date)}, Slot: (${booking.slot || ""})`, ML, y + 15);

            doc.text(`Mechanic: ${booking.mechanicId?.fullName || "N/A"}`, 350, y);
            doc.text(`Contact: ${booking.mechanicId?.phoneNumber || "N/A"}`, 350, y + 15);

            y += 45;
            doc.moveTo(ML, y).lineTo(doc.page.width - MR, y).strokeColor(COLORS.lightGray).lineWidth(1).stroke();
            y += 15;

            doc.fontSize(10).fillColor(COLORS.dark).font("Helvetica-Bold").text("Billed To:", ML, y);
            doc.fontSize(10).font("Helvetica");
            doc.text(`${booking.ownerId?.fullName || "N/A"}`, ML, y + 14);
            doc.text(`Phone: ${booking.ownerId?.phoneNumber || "N/A"}`, ML, y + 28);
            doc.text(`Address: ${booking.address || "N/A"}`, ML, y + 42);

            y += 65;
            doc.moveTo(ML, y).lineTo(doc.page.width - MR, y).strokeColor(COLORS.lightGray).lineWidth(1).stroke();
            y += 15;

            doc.fontSize(10).fillColor(COLORS.white).rect(ML, y, CW, 20).fill(COLORS.primary);
            doc.fontSize(9).fillColor(COLORS.white).font("Helvetica-Bold");
            doc.text("Description", ML + 8, y + 6, { width: CW - 130, lineBreak: false });
            doc.text("Amount", ML + CW - 80, y + 6, { width: 72, align: "right", lineBreak: false });

            y += 25;

            const drawRow = (label, amount, isDiscount = false) => {
                const rowBg = y % 2 === 0 ? "#fafafa" : COLORS.white;
                doc.rect(ML, y, CW, 22).fill(rowBg);
                doc.fontSize(9).fillColor(isDiscount ? COLORS.red : COLORS.dark).font("Helvetica");
                doc.text(label, ML + 8, y + 6, { width: CW - 130, lineBreak: false });
                doc.text(`${isDiscount ? "-" : ""}₹${amount}`, ML + CW - 80, y + 6, { width: 72, align: "right", lineBreak: false });
                y += 22;
            };

            drawRow(`Sub Total: ${booking.serviceId?.fullName || "N/A"}`, booking.subTotal || 0);

            if (booking.consultantFee) {
                drawRow("Consultant Fee", booking.consultantFee);
            };

            (booking.quotation || []).forEach((item) => {
                drawRow(`Quotation: ${item.serviceName}`, item.price);
            });

            if (booking.discountAmount) {
                drawRow("Discount", booking.discountAmount, true);
            };

            y += 5;
            doc.moveTo(ML, y).lineTo(doc.page.width - MR, y).strokeColor(COLORS.lightGray).lineWidth(1).stroke();
            y += 15;

            const drawSummaryRow = (label, amount, isBold = false) => {
                doc.fontSize(10).fillColor(COLORS.dark).font(isBold ? "Helvetica-Bold" : "Helvetica");
                doc.text(label, ML + CW - 180, y, { width: 120, lineBreak: false });
                doc.text(`₹${amount}`, ML + CW - 55, y, { width: 47, align: "right", lineBreak: false });
                y += 18;
            };

            drawSummaryRow("Subtotal:", subTotal);
            drawSummaryRow("GST (18%):", booking.taxAmount || 0);

            y += 5;
            doc.moveTo(ML, y).lineTo(doc.page.width - MR, y).strokeColor(COLORS.primary).lineWidth(2).stroke();
            y += 10;

            doc.fontSize(12).fillColor(COLORS.primary).font("Helvetica-Bold");
            doc.text("Total Amount:", ML + CW - 180, y, { width: 120, lineBreak: false });
            doc.text(`₹${booking.totalAmount || 0}`, ML + CW - 55, y, { width: 47, align: "right", lineBreak: false });

            y += 50;
            doc.fontSize(9).fillColor(COLORS.gray).font("Helvetica").text("Thank you for choosing Car-Mate!", ML, y, { width: CW, align: "center" });
            doc.text("If you have any questions, contact support@carmate.com.", ML, y + 14, { width: CW, align: "center" });

            doc.fontSize(7).fillColor(COLORS.gray).text(
                `Generated on ${formatDate(new Date())}`,
                ML,
                doc.page.height - 30,
                { width: CW, align: "center" },
            );

            doc.end();

            stream.on("finish", () => {
                resolve({ fileName, filePath, folder: "upload_invoice" });
            });

            stream.on("error", (err) => {
                reject(err);
            });
        } catch (error) {
            reject(error);
        };
    });
};
