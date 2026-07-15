import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
    getLoginPage,
    postLogin,
} from "../controllers/auth.controller.js";
import {
    getDashboardPage,
    getCarOwnerPage,
    postAllCarOwnerList,
    postCarOwnerDetails,
    postCarOwnerDelete,
    getCarMechanicPage,
    postAllCarMechanicList,
    postCarMechanicDetails,
    postCarMechanicDelete,
    getCarsPage,
    postAllCarsList,
    postCarDetails,
    postCarDelete,
    getServicePage,
    postAddService,
    postAllServiceList,
    postServiceDetails,
    postServiceUpdate,
    postServiceDelete,
    getBookingPage,
    postAllBookingList,
    postBookingDetails,
    postDeleteBooking,
    getTransactionPage,
    postAllTransactionList,
    postTransactionDetails,
    getReviewPage,
    getSettingsPage,
    postUpdateSettings,
    postUpdatePasswords,
    postLogout,
} from "../controllers/admin.controller.js";

const adminRouter = express.Router();

// Auth API
adminRouter.get("/login/:secret", getLoginPage);
adminRouter.post("/login", postLogin);

// Dashboard API
adminRouter.get("/dashboard", authMiddleware, getDashboardPage);

// Car Owner API
adminRouter.get("/car-owner", authMiddleware, getCarOwnerPage);
adminRouter.post("/car-owner-list", authMiddleware, postAllCarOwnerList);
adminRouter.post("/car-owner-details", authMiddleware, postCarOwnerDetails);
adminRouter.post("/car-owner-delete", authMiddleware, postCarOwnerDelete);

// Mechanic API
adminRouter.get("/mechanic", authMiddleware, getCarMechanicPage);
adminRouter.post("/mechanic-list", authMiddleware, postAllCarMechanicList);
adminRouter.post("/mechanic-details", authMiddleware, postCarMechanicDetails);
adminRouter.post("/mechanic-delete", authMiddleware, postCarMechanicDelete);

// Car API
adminRouter.get("/cars", authMiddleware, getCarsPage);
adminRouter.post("/car-list", authMiddleware, postAllCarsList);
adminRouter.post("/car-details", authMiddleware, postCarDetails);
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
adminRouter.post("/booking-list", authMiddleware, postAllBookingList);
adminRouter.post("/booking-details", authMiddleware, postBookingDetails);
adminRouter.post("/booking-delete", authMiddleware, postDeleteBooking);

// Transaction API
adminRouter.get("/transactions", authMiddleware, getTransactionPage);
adminRouter.post("/transaction-list", authMiddleware, postAllTransactionList);
adminRouter.post("/transaction-details", authMiddleware, postTransactionDetails);

// Reviews API
adminRouter.get("/reviews", authMiddleware, getReviewPage);

// settings API
adminRouter.get("/settings", authMiddleware, getSettingsPage);
adminRouter.post("/update-settings", authMiddleware, postUpdateSettings);
adminRouter.post("/update-password", authMiddleware, postUpdatePasswords);
adminRouter.post("/logout", authMiddleware, postLogout);

export default adminRouter;