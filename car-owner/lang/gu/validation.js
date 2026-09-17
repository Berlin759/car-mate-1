const validation = {
    attributes: {
        name: 'નામ',
        phone_no: 'મોબાઈલ નંબર',
        otp: 'ઓટીપી',
        operating_time: 'કાર્યકારી સમય',
        gender: 'લિંગ',
        avatar: 'અવતાર',
        id_proof: 'આઈડી પ્રૂફ',
        id_number: 'આઈડી નંબર',
        payment_id: 'ચુકવણી ID',
        day: 'દિવસ',
        slot: 'સ્લોટ',
        status: 'સ્થિતિ',
        date: 'તારીખ',
        reject_note: 'નકારવાની નોંધ',
        bank_type: 'બેંકનો પ્રકાર',
        ifsc: 'IFSC કોડ',
        bank_name: 'બેંકનું નામ',
        account_number: 'ખાતા નંબર',
        username: 'વપરાશકર્તા નામ',
        address: 'સરનામું / VPA',
        currency: 'ચલણ',
    },
    messages: {
        required: ':attribute આવશ્યક છે.',
        numeric: ':attribute નંબર હોવો જોઈએ.',
        min: {
            numeric: ':attribute ઓછામાં ઓછું :min હોવું જોઈએ.',
            string: ':attribute ઓછામાં ઓછા :min અક્ષરોનું હોવું જોઈએ.'
        },
        max: {
            numeric: ':attribute વધુમાં વધુ :max હોવું જોઈએ.',
            string: ':attribute વધુમાં વધુ :max અક્ષરોનું હોવું જોઈએ.'
        },
        in: ':attribute માન્ય મૂલ્ય હોવું જોઈએ.',
        date: ':attribute માન્ય તારીખ હોવી જોઈએ.',
        digits: ':attribute :digits અંકોનું હોવું જોઈએ.',
        def: ':attribute અમાન્ય છે.',
        image: ':attribute એક છબી હોવી જોઈએ.',
        mimes: ':attribute નો પ્રકાર :values માંથી એક હોવો જોઈએ.',
        size_max: ':attribute નું કદ :size_max KB કરતા ઓછું હોવું જોઈએ.',
        select_slot: 'કૃપા કરીને સ્લોટ પસંદ કરો.',
        select_timings: 'કૃપા કરીને સમય પસંદ કરો.',
        time_slot_validation: ':attribute ઓર્ડર સ્વીકારવાનો સમય અને ઓર્ડર ડિલિવરીનો સમય સાથે હોવા જોઈએ.',
        time_format: ':attribute માન્ય સમય ફોર્મેટ (HH:MM) માં હોવું જોઈએ.',
    },
};

export default validation;