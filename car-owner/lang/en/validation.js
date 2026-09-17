const validation = {
    attributes: {
        name: 'Name',
        phone_no: 'Phone Number',
        otp: 'OTP',
        operating_time: 'Operating Time',
        gender: 'Gender',
        avatar: 'Avatar',
        id_proof: 'ID Proof',
        id_number: 'ID Number',
        payment_id: 'Payment ID',
        day: 'Day',
        slot: 'Slot',
        status: 'Status',
        date: 'Date',
        reject_note: 'Reject Note',
        bank_type: 'Bank Type',
        ifsc: 'IFSC Code',
        bank_name: 'Bank Name',
        account_number: 'Account Number',
        username: 'Username',
        address: 'Address / VPA',
        currency: 'Currency',
    },
    messages: {
        required: ':attribute is required.',
        numeric: ':attribute must be a number.',
        min: {
            numeric: ':attribute must be at least :min.',
            string: ':attribute must be at least :min characters.'
        },
        max: {
            numeric: ':attribute must be at most :max.',
            string: ':attribute must be at most :max characters.'
        },
        in: ':attribute must be one of the following: :values.',
        date: ':attribute must be a valid date.',
        digits: ':attribute must be :digits digits.',
        def: 'The :attribute is invalid.',
        image: 'The :attribute must be an image.',
        mimes: 'The :attribute must be a type of: :values.',
        size_max: 'The :attribute size must be less than :size_max KB.',
        select_slot: 'Please select slot.',
        select_timings: 'Please select timings.',
        time_slot_validation: ':attribute order_accept_time and order_preparing_time must be provided together.',
        time_format: ':attribute must be a valid time format (HH:MM).',
    },
};

export default validation;