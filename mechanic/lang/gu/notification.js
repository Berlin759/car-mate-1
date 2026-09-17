const notification = {
    get_all: "બધી સૂચનાઓ સફળતાપૂર્વક મેળવી.",
    get_all_error: "બધી સૂચનાઓ મેળવવામાં નિષ્ફળ.",
    mark_one_as_read: "સૂચના વાંચી તરીકે ચિહ્નિત.",
    mark_one_as_read_error: "સૂચના વાંચી તરીકે ચિહ્નિત કરવામાં નિષ્ફળ.",
    mark_all_as_read: "બધી સૂચનાઓ વાંચી તરીકે ચિહ્નિત.",
    mark_all_as_read_error: "બધી સૂચનાઓ વાંચી તરીકે ચિહ્નિત કરવામાં નિષ્ફળ.",
    not_found: "સૂચના મળી નથી અથવા અનધિકૃત.",
    types: {
        new_order_received: {
            title: "નવો ઓર્ડર",
            body: "તમને નવો ઓર્ડર {order_id} મળ્યો છે."
        },
        order_accepted_by_chef: {
            title: "ઓર્ડર સ્વીકૃત",
            body: "તમે ઓર્ડર {order_id} સ્વીકાર્યો છે."
        },
        order_rejected_by_chef: {
            title: "ઓર્ડર નકારેલ",
            body: "તમે ઓર્ડર {order_id} નકાર્યો છે."
        },
        new_review_received: {
            title: "નવી સમીક્ષા (રીવ્યુ)",
            body: "તમને નવી સમીક્ષા મળી છે."
        },
        order_cancelled: {
            title: "ઓર્ડર રદ",
            body: "ઓર્ડર {order_id} રદ કરવામાં આવ્યો છે."
        },
        order_assigned_driver: {
            title: "ઓર્ડર ફાળવવામાં આવ્યો",
            body: "તમારો ઓર્ડર {order_id} ડિલિવરી બોય {driver_name} દ્વારા સ્વીકારવામાં આવ્યો છે અને ટૂંક સમયમાં પિકઅપ માટે આવશે."
        },
        order_out_for_delivery: {
            title: "ઓર્ડર પિકઅપ થયો",
            body: "ઓર્ડર {order_id} ડિલિવરી પાર્ટનર દ્વારા સફળતાપૂર્વક પિકઅપ કરવામાં આવ્યો છે."
        },
        order_delivered: {
            title: "ઓર્ડર ડિલિવર થયો",
            body: "ઓર્ડર {order_id} ગ્રાહકને સફળતાપૂર્વક ડિલિવર કરવામાં આવ્યો છે."
        },
        withdrawal_approved: {
            title: "ઉપાડ (Withdrawal) મંજૂર",
            body: "તમારી ₹{amount} ના ઉપાડની વિનંતી સફળતાપૂર્વક મંજૂર કરવામાં આવી છે."
        },
        withdrawal_rejected: {
            title: "ઉપાડ (Withdrawal) અસ્વીકૃત",
            body: "તમારી ₹{amount} ના ઉપાડની વિનંતી એડમિન દ્વારા અસ્વીકાર કરવામાં આવી છે."
        }
    }
};

export default notification;