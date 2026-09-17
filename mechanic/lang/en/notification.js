const notification = {
    get_all: "Notifications fetched successfully.",
    get_all_error: "Failed to fetch notifications.",
    mark_one_as_read: "Notification marked as read.",
    mark_one_as_read_error: "Failed to mark notification as read.",
    mark_all_as_read: "All notifications marked as read.",
    mark_all_as_read_error: "Failed to mark all notifications as read.",
    not_found: "Notification not found or unauthorized.",
    types: {
        new_order_received: {
            title: "New Order",
            body: "You have received a new order {order_id}."
        },
        order_accepted_by_chef: {
            title: "Order Confirmed",
            body: "You accepted order {order_id}."
        },
        order_rejected_by_chef: {
            title: "Order Rejected",
            body: "You rejected order {order_id}."
        },
        new_review_received: {
            title: "New Review",
            body: "You have received a new review."
        },
        order_cancelled: {
            title: "Order Cancelled",
            body: "Order {order_id} was cancelled."
        },
        order_assigned_driver: {
            title: "Order Assigned",
            body: "Your order {order_id} has been accepted by driver {driver_name} and will arrive soon for pickup."
        },
        order_out_for_delivery: {
            title: "Order Picked Up",
            body: "Order {order_id} has been picked up successfully by the delivery partner."
        },
        order_delivered: {
            title: "Order Delivered",
            body: "The order {order_id} has been successfully delivered to the customer."
        },
        withdrawal_approved: {
            title: "Withdrawal Approved",
            body: "Your withdrawal request of ₹{amount} has been approved successfully."
        },
        withdrawal_rejected: {
            title: "Withdrawal Rejected",
            body: "Your withdrawal request of ₹{amount} has been rejected by the admin."
        },
    },
};

export default notification;