import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
    getLoginPage,
    postLogin,
} from "../controllers/auth.controller.js";
import {
    getDashboardPage,
    getCarOwnerPage,
    getCarOwnerDetailPage,
    postAddOwner,
    postAllCarOwnerList,
    postCarOwnerDetails,
    postUpdateOwner,
    postCarOwnerDelete,
    getMechanicPage,
    getMechanicDetailPage,
    postAddMechanic,
    postAllMechanicList,
    postMechanicDetails,
    postMechanicUpdate,
    postMechanicDelete,
    getCarsPage,
    getCarDetailPage,
    postAddCar,
    postAllCarsList,
    postCarDetails,
    postUpdateCar,
    postCarDelete,
    getServicePage,
    postAddService,
    postAllServiceList,
    postServiceDetails,
    postServiceUpdate,
    postServiceDelete,
    getBookingPage,
    getBookingDetailPage,
    postAllBookingList,
    postBookingDetails,
    postDeleteBooking,
    getTransactionPage,
    getTransactionDetailPage,
    postAllTransactionList,
    postTransactionDetails,
    getTransactionDownload,
    getAllTransactionsDownload,
    getReviewPage,
    postAllReviewList,
    postReviewDetails,
    // postDashboardKPIs,
    getSettingsPage,
    postUpdateSettings,
    postUpdatePasswords,
    postLogout,
    postAddCoupon,
    postCouponList,
    postUpdateCoupon,
    postDeleteCoupon,
    postAssignProvider,
    postRescheduleBooking,
    postSuspendOwner,
    postSuspendMechanic,
    postRevenueReport,
    postServicePopularityReport,
    postProviderPerformanceReport,
    postPeakHoursReport,
    postCancellationTrendsReport,
    postAddBanner,
    postBannerList,
    postDeleteBanner,
    postAddFaq,
    postFaqList,
    postDeleteFaq,
    postToggleFaqStatus,
    postAddAnnouncement,
    postAnnouncementList,
    postDeleteAnnouncement,
    postToggleAnnouncementStatus,
    postDisputeList,
    postResolveDispute,
    getDisputePage,
    getBannerPage,
    getFaqPage,
    getAnnouncementPage,
    getPricingPage,
    postPricingDetails,
    postUpdatePricing,
    getTemplatePage,
    postTemplateList,
    postTemplateDetails,
    postAddTemplate,
    postUpdateTemplate,
    postDeleteTemplate,
    postToggleTemplateStatus,
    postSeedDefaultTemplates,
    getKYCPage,
    getKYCDetailPage,
    getAddKYCPage,
    postSubmitKYC,
    postPendingKYCList,
    postApproveKYC,
    postRejectKYC,
} from "../controllers/admin.controller.js";

const adminRouter = express.Router();

// Auth API
adminRouter.get("/login/:secret", getLoginPage);
adminRouter.post("/login", postLogin);

// Dashboard API
adminRouter.get("/dashboard", authMiddleware, getDashboardPage);

// Car Owner API
adminRouter.get("/car-owner", authMiddleware, getCarOwnerPage);
adminRouter.get("/car-owner/:id", authMiddleware, getCarOwnerDetailPage);
adminRouter.post("/add-owner", authMiddleware, postAddOwner);
adminRouter.post("/car-owner-list", authMiddleware, postAllCarOwnerList);
adminRouter.post("/car-owner-details", authMiddleware, postCarOwnerDetails);
adminRouter.post("/update-owner", authMiddleware, postUpdateOwner);
adminRouter.post("/car-owner-delete", authMiddleware, postCarOwnerDelete);

// Mechanic API
adminRouter.get("/mechanic", authMiddleware, getMechanicPage);
adminRouter.get("/mechanic/:id", authMiddleware, getMechanicDetailPage);
adminRouter.post("/add-mechanic", authMiddleware, postAddMechanic);
adminRouter.post("/mechanic-list", authMiddleware, postAllMechanicList);
adminRouter.post("/mechanic-details", authMiddleware, postMechanicDetails);
adminRouter.post("/mechanic-update", authMiddleware, postMechanicUpdate);
adminRouter.post("/mechanic-delete", authMiddleware, postMechanicDelete);

// Car API
adminRouter.get("/cars", authMiddleware, getCarsPage);
adminRouter.get("/cars/:id", authMiddleware, getCarDetailPage);
adminRouter.post("/add-car", authMiddleware, postAddCar);
adminRouter.post("/car-list", authMiddleware, postAllCarsList);
adminRouter.post("/car-details", authMiddleware, postCarDetails);
adminRouter.post("/car-update", authMiddleware, postUpdateCar);
adminRouter.post("/car-delete", authMiddleware, postCarDelete);

// Service API
adminRouter.get("/service", authMiddleware, getServicePage);
adminRouter.post("/add-service", authMiddleware, postAddService);
adminRouter.post("/service-list", authMiddleware, postAllServiceList);
adminRouter.post("/service-details", authMiddleware, postServiceDetails);
adminRouter.post("/service-update", authMiddleware, postServiceUpdate);
adminRouter.post("/service-delete", authMiddleware, postServiceDelete);

// Booking API
adminRouter.get("/bookings", authMiddleware, getBookingPage);
adminRouter.get("/booking/:id", authMiddleware, getBookingDetailPage);
adminRouter.post("/booking-list", authMiddleware, postAllBookingList);
adminRouter.post("/booking-details", authMiddleware, postBookingDetails);
adminRouter.post("/booking-delete", authMiddleware, postDeleteBooking);

// Transaction API
adminRouter.get("/transactions", authMiddleware, getTransactionPage);
adminRouter.get("/transaction/:id", authMiddleware, getTransactionDetailPage);
adminRouter.post("/transaction-list", authMiddleware, postAllTransactionList);
adminRouter.post("/transaction-details", authMiddleware, postTransactionDetails);
adminRouter.get("/transaction/:id/download", authMiddleware, getTransactionDownload);
adminRouter.get("/transactions/download-all", authMiddleware, getAllTransactionsDownload);

// Reviews API
adminRouter.get("/reviews", authMiddleware, getReviewPage);
adminRouter.post("/review-list", authMiddleware, postAllReviewList);
adminRouter.post("/review-details", authMiddleware, postReviewDetails);

// KYC API
adminRouter.get("/kyc", authMiddleware, getKYCPage);
adminRouter.get("/kyc/add/:id", authMiddleware, getAddKYCPage);
adminRouter.get("/kyc/:id", authMiddleware, getKYCDetailPage);
adminRouter.post("/kyc/submit", authMiddleware, postSubmitKYC);
adminRouter.post("/kyc-list", authMiddleware, postPendingKYCList);
adminRouter.post("/kyc-approve", authMiddleware, postApproveKYC);
adminRouter.post("/kyc-reject", authMiddleware, postRejectKYC);

// settings API
adminRouter.get("/settings", authMiddleware, getSettingsPage);
adminRouter.post("/update-settings", authMiddleware, postUpdateSettings);
adminRouter.post("/update-password", authMiddleware, postUpdatePasswords);
adminRouter.post("/logout", authMiddleware, postLogout);

// Coupon API
adminRouter.post("/add-coupon", authMiddleware, postAddCoupon);
adminRouter.post("/coupon-list", authMiddleware, postCouponList);
adminRouter.post("/update-coupon", authMiddleware, postUpdateCoupon);
adminRouter.post("/delete-coupon", authMiddleware, postDeleteCoupon);

// Booking Operations
adminRouter.post("/assign-provider", authMiddleware, postAssignProvider);
adminRouter.post("/reschedule-booking", authMiddleware, postRescheduleBooking);

// User Status Management
adminRouter.post("/suspend-owner", authMiddleware, postSuspendOwner);
adminRouter.post("/suspend-mechanic", authMiddleware, postSuspendMechanic);

// Reports & Analytics
adminRouter.post("/revenue-report", authMiddleware, postRevenueReport);
adminRouter.post("/service-popularity-report", authMiddleware, postServicePopularityReport);
adminRouter.post("/provider-performance-report", authMiddleware, postProviderPerformanceReport);
adminRouter.post("/peak-hours-report", authMiddleware, postPeakHoursReport);
adminRouter.post("/cancellation-trends-report", authMiddleware, postCancellationTrendsReport);

// CMS - Banners
adminRouter.get("/banners", authMiddleware, getBannerPage);
adminRouter.post("/add-banner", authMiddleware, postAddBanner);
adminRouter.post("/banner-list", authMiddleware, postBannerList);
adminRouter.post("/delete-banner", authMiddleware, postDeleteBanner);

// CMS - FAQs
adminRouter.get("/faqs", authMiddleware, getFaqPage);
adminRouter.post("/add-faq", authMiddleware, postAddFaq);
adminRouter.post("/faq-list", authMiddleware, postFaqList);
adminRouter.post("/delete-faq", authMiddleware, postDeleteFaq);
adminRouter.post("/toggle-faq-status", authMiddleware, postToggleFaqStatus);

// CMS - Announcements
adminRouter.get("/announcements", authMiddleware, getAnnouncementPage);
adminRouter.post("/add-announcement", authMiddleware, postAddAnnouncement);
adminRouter.post("/announcement-list", authMiddleware, postAnnouncementList);
adminRouter.post("/delete-announcement", authMiddleware, postDeleteAnnouncement);
adminRouter.post("/toggle-announcement-status", authMiddleware, postToggleAnnouncementStatus);

// Dispute Resolution
adminRouter.get("/disputes", authMiddleware, getDisputePage);
adminRouter.post("/dispute-list", authMiddleware, postDisputeList);
adminRouter.post("/resolve-dispute", authMiddleware, postResolveDispute);

// Pricing Management
adminRouter.get("/pricing", authMiddleware, getPricingPage);
adminRouter.post("/pricing-details", authMiddleware, postPricingDetails);
adminRouter.post("/update-pricing", authMiddleware, postUpdatePricing);

// Template Management
adminRouter.get("/templates", authMiddleware, getTemplatePage);
adminRouter.post("/template-list", authMiddleware, postTemplateList);
adminRouter.post("/template-details", authMiddleware, postTemplateDetails);
adminRouter.post("/add-template", authMiddleware, postAddTemplate);
adminRouter.post("/update-template", authMiddleware, postUpdateTemplate);
adminRouter.post("/delete-template", authMiddleware, postDeleteTemplate);
adminRouter.post("/toggle-template-status", authMiddleware, postToggleTemplateStatus);
adminRouter.post("/seed-default-templates", authMiddleware, postSeedDefaultTemplates);

export default adminRouter;