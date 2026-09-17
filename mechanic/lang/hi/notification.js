const notification = {
    get_all: "सभी सूचनाएं सफलतापूर्वक प्राप्त हुई।",
    get_all_error: "सभी सूचनाएं प्राप्त करने में विफल।",
    mark_one_as_read: "सूचना पढ़ी के रूप में चिह्नित।",
    mark_one_as_read_error: "सूचना पढ़ी के रूप में चिह्नित करने में विफल।",
    mark_all_as_read: "सभी सूचनाएं पढ़ी के रूप में चिह्नित।",
    mark_all_as_read_error: "सभी सूचनाएं पढ़ी के रूप में चिह्नित करने में विफल।",
    not_found: "सूचना मिली नहीं या अनधिकृत।",
    types: {
        new_order_received: {
            title: "नया ऑर्डर",
            body: "आपको एक नया ऑर्डर {order_id} प्राप्त हुआ है।"
        },
        order_accepted_by_chef: {
            title: "ऑर्डर स्वीकृत",
            body: "आपने ऑर्डर {order_id} स्वीकार कर लिया है।"
        },
        order_rejected_by_chef: {
            title: "ऑर्डर अस्वीकृत",
            body: "आपने ऑर्डर {order_id} अस्वीकार कर दिया है।"
        },
        new_review_received: {
            title: "नयी समीक्षा",
            body: "आपको एक नयी समीक्षा प्राप्त हुई है।"
        },
        order_cancelled: {
            title: "ऑर्डर रद्द",
            body: "ऑर्डर {order_id} रद्द कर दिया गया है।"
        },
        order_assigned_driver: {
            title: "ऑर्डर असाइन किया गया",
            body: "आपका ऑर्डर {order_id} डिलीवरी पार्टनर {driver_name} द्वारा स्वीकार कर लिया गया है और जल्द ही पिकअप के लिए पहुंचेगा।"
        },
        order_out_for_delivery: {
            title: "ऑर्डर पिकअप हुआ",
            body: "ऑर्डर {order_id} डिलीवरी पार्टनर द्वारा सफलतापूर्वक पिकअप कर लिया गया है।"
        },
        order_delivered: {
            title: "ऑर्डर डिलीवर हुआ",
            body: "ऑर्डर {order_id} ग्राहक को सफलतापूर्वक डिलीवर कर दिया गया है।"
        },
        withdrawal_approved: {
            title: "निकासी स्वीकृत",
            body: "आपका ₹{amount} की निकासी का अनुरोध सफलतापूर्वक स्वीकृत कर दिया गया है।"
        },
        withdrawal_rejected: {
            title: "निकासी अस्वीकृत",
            body: "आपका ₹{amount} की निकासी का अनुरोध एडमिन द्वारा अस्वीकृत कर दिया गया है।"
        }
    }
};

export default notification;