const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function clean() {
    const idsToDelete = [
        '78ff2455-0cef-4011-a97e-508fd5b154bb',
        '4deb3fa7-6b58-41b3-a463-210b86d981a3',
        'e52205e4-6765-439c-82d2-136ce576bd53',
        'c3f8f2a2-dd58-40cb-9bd2-3ba4825dd74a',
        'b379f486-0c9b-4359-bf5e-22c1c93f1ca1',
        'b7800053-ddcd-4b86-8ca2-2a88766c4b77'
    ];

    const { data, error } = await supabase.from('payment_packages').delete().in('id', idsToDelete);
    console.log("DELETED:", error || "SUCCESS");
}

clean();
