const validation = {
    attributes: {
        name: 'नाम',
        phone_no: 'मोबाइल नंबर',
        otp: 'ओटीपी',
        operating_time: 'काम करने का समय',
        gender: 'लिंग',
        avatar: 'अवतार',
        id_proof: 'आईडी प्रूफ',
        id_number: 'आईडी नंबर',
        payment_id: 'भुगतान आईडी',
        day: 'दिन',
        slot: 'स्लॉट',
        status: 'स्थिति',
        date: 'तारीख',
        reject_note: 'अस्वीकृति नोट',
        bank_type: 'बैंक का प्रकार',
        ifsc: 'IFSC कोड',
        bank_name: 'बैंक का नाम',
        account_number: 'खाता संख्या',
        username: 'यूजरनेम',
        address: 'पता / VPA',
        currency: 'मुद्रा',
    },
    messages: {
        required: ':attribute आवश्यक है।',
        numeric: ':attribute संख्या होना चाहिए।',
        min: {
            numeric: ':attribute कम से कम :min होना चाहिए।',
            string: ':attribute कम से कम :min अक्षरों का होना चाहिए।'
        },
        max: {
            numeric: ':attribute अधिक से अधिक :max होना चाहिए।',
            string: ':attribute अधिक से अधिक :max अक्षरों का होना चाहिए।'
        },
        in: ':attribute मान्य मान होना चाहिए।',
        date: ':attribute मान्य तारीख होना चाहिए।',
        digits: ':attribute :digits अंकों का होना चाहिए।',
        def: ':attribute अमान्य है।',
        image: ':attribute एक छवि होनी चाहिए।',
        mimes: ':attribute का प्रकार :values में से एक होना चाहिए।',
        size_max: ':attribute का आकार :size_max KB से कम होना चाहिए।',
        select_slot: 'कृपया स्लॉट चुनें।',
        select_timings: 'कृपया समय चुनें।',
        time_slot_validation: ':attribute ऑर्डर स्वीकार करने का समय और ऑर्डर डिलीवरी का समय साथ होने चाहिए।',
        time_format: ':attribute मान्य समय प्रारूप (HH:MM) में होना चाहिए।',
    },
};

export default validation;