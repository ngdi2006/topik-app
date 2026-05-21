const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function approve() {
    const txCode = 'SEVQR1779343547084J80K0';
    
    // Find transaction
    const { data: tx, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('transaction_code', txCode)
        .single();
        
    if (error || !tx) {
        console.error("Tx not found:", error);
        return;
    }
    
    console.log("Found tx:", tx);
    
    // Update status
    const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
            payment_status: 'completed',
            verified_at: new Date().toISOString(),
            notes: 'Manual approval for testing'
        })
        .eq('id', tx.id);
        
    if (updateError) {
        console.error("Update error:", updateError);
        return;
    }
    
    // Add credits
    const { error: creditError } = await supabase.rpc('increment_user_credits', {
        p_user_id: tx.user_id,
        p_credits: tx.credits_purchased
    });
    
    if (creditError) {
        console.error("Credit error:", creditError);
    } else {
        console.log("Successfully approved and added credits!");
    }
}

approve();
