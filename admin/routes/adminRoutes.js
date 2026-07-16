import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
    getLoginPage,
    postLogin,
} from "../controllers/auth.controller.js";
import {
    getDashboardPage,
    getCarOwnerPage,
    postAddOwner,
    postAllCarOwnerList,
    postCarOwnerDetails,
    postUpdateOwner,
    postCarOwnerDelete,
    getMechanicPage,
    postAddMechanic,
    postAllMechanicList,
    postMechanicDetails,
    postMechanicUpdate,
    postMechanicDelete,
    getCarsPage,
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
adminRouter.post("/add-owner", authMiddleware, postAddOwner);
adminRouter.post("/car-owner-list", authMiddleware, postAllCarOwnerList);
adminRouter.post("/car-owner-details", authMiddleware, postCarOwnerDetails);
adminRouter.post("/update-owner", authMiddleware, postUpdateOwner);
adminRouter.post("/car-owner-delete", authMiddleware, postCarOwnerDelete);

// Mechanic API
adminRouter.get("/mechanic", authMiddleware, getMechanicPage);
adminRouter.post("/add-mechanic", authMiddleware, postAddMechanic);
adminRouter.post("/mechanic-list", authMiddleware, postAllMechanicList);
adminRouter.post("/mechanic-details", authMiddleware, postMechanicDetails);
adminRouter.post("/mechanic-update", authMiddleware, postMechanicUpdate);
adminRouter.post("/mechanic-delete", authMiddleware, postMechanicDelete);

// Car API
adminRouter.get("/cars", authMiddleware, getCarsPage);
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