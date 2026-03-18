import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kmmwgqyzcaqqzupgmbvv.supabase.co";
const supabaseKey = "sb_publishable_vmmi9Qtl_hsxFEafcjLMCw_1mbqb5mK";

export const supabase = createClient(supabaseUrl, supabaseKey);