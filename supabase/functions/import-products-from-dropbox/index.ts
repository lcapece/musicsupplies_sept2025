import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Dropbox } from "https://esm.sh/dropbox@10.34.0"; // Dropbox SDK
import Papa from "https://esm.sh/papaparse@5.3.0"; // CSV parser

// WARNING: Ensure these environment variables are set in your Supabase project settings
const DROPBOX_APP_KEY = Deno.env.get("DROPBOX_APP_KEY");
const DROPBOX_APP_SECRET = Deno.env.get("DROPBOX_APP_SECRET");
// Note: For Dropbox, you might need an access token instead of app key/secret for direct file download
// This example assumes you might generate a long-lived access token and store it, or use OAuth2 flow.
// For simplicity, this example might need adjustment based on your exact Dropbox auth strategy.
// A common approach for server-side is using an access token.
const DROPBOX_ACCESS_TOKEN = Deno.env.get("DROPBOX_ACCESS_TOKEN"); // Recommended

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const STAGING_TABLE_NAME = "stg_products";
const DROPBOX_FILE_PATH = "/warehouse/transport_products.csv";

serve(async (req) => {
  // Check for required environment variables
  if (!DROPBOX_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing environment variables: DROPBOX_ACCESS_TOKEN, SUPABASE_URL, or SUPABASE_ANON_KEY");
    return new Response(
      JSON.stringify({ error: "Server configuration error: Missing environment variables." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabaseAdminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // It's better to use the service role key for admin operations if available and secure
    // For this example, using anon key but admin operations like TRUNCATE might need service_role
    // auth: { persistSession: false } // Uncomment if using service role key
  });

  try {
    console.log("Starting product import process...");

    // 1. Download CSV from Dropbox
    console.log(`Attempting to download ${DROPBOX_FILE_PATH} from Dropbox...`);
    const dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN });
    let fileContent = "";
    try {
      const response: any = await dbx.filesDownload({ path: DROPBOX_FILE_PATH });
      // Dropbox SDK for Deno/browser might return fileBlob or similar.
      // This part needs to correctly handle the response type from the SDK.
      // Assuming 'fileBinary' or similar for this example, convert to text.
      if (response.result && response.result.fileBinary) {
         fileContent = new TextDecoder().decode(response.result.fileBinary);
      } else if (response.result && typeof response.result.fileBlob !== 'undefined') {
        fileContent = await response.result.fileBlob.text();
      }
      else {
        // Fallback for older SDK versions or different response structures
        // This part is highly dependent on the exact Dropbox SDK version and its Deno compatibility
        const tempFileContent = (response as any).result?.fileString || (response as any).result?.data;
        if (typeof tempFileContent === 'string') {
            fileContent = tempFileContent;
        } else {
            console.error("Dropbox file content is in an unexpected format:", response.result);
            throw new Error("Failed to decode Dropbox file content.");
        }
      }
      console.log("Successfully downloaded CSV from Dropbox.");
    } catch (dropboxError) {
      console.error("Dropbox API error:", dropboxError);
      throw new Error(`Failed to download from Dropbox: ${dropboxError.error?.error_summary || dropboxError.message || 'Unknown Dropbox error'}`);
    }
    
    // 2. Parse CSV
    console.log("Parsing CSV content...");
    const parseResult = Papa.parse(fileContent, {
      header: true, // Assumes first row is header
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      console.error("CSV parsing errors:", parseResult.errors);
      throw new Error("Failed to parse CSV file. Check CSV format and content.");
    }
    let products = parseResult.data as any[];
    console.log(`Successfully parsed ${products.length} rows from CSV.`);

    // Map CSV headers to Supabase column names (case-sensitive)
    // CSV headers: modelnumber, descripttion, price, inv, prdmetacat, prdmaincat, prdsubcat
    // Supabase columns: modelnumber, descripttion, price, inv, prdmetacat, prdmaincat, prdsubcat
    products = products.map(p => ({
      modelnumber: p.modelnumber || null,
      descripttion: p.descripttion || null, // Typo as specified
      price: parseFloat(p.price) || 0.0,    // Ensure price is a number
      inv: p.inv || null,
      prdmetacat: p.prdmetacat || null,
      prdmaincat: p.prdmaincat || null,
      prdsubcat: p.prdsubcat || null,
    }));

    // 3. Truncate staging table
    // IMPORTANT: TRUNCATE requires higher privileges. 
    // Using DELETE FROM for broader compatibility with anon key, but TRUNCATE is better.
    // If using service_role key, TRUNCATE is preferred:
    // const { error: truncateError } = await supabaseAdminClient.rpc('execute_sql', { sql: `TRUNCATE TABLE ${STAGING_TABLE_NAME};` });
    console.log(`Clearing staging table: ${STAGING_TABLE_NAME}...`);
    const { error: deleteError } = await supabaseAdminClient
      .from(STAGING_TABLE_NAME)
      .delete()
      .neq('modelnumber', 'this_is_a_placeholder_to_delete_all'); // Supabase requires a filter for delete

    if (deleteError) {
      console.error("Error clearing staging table:", deleteError);
      throw new Error(`Failed to clear staging table: ${deleteError.message}`);
    }
    console.log("Successfully cleared staging table.");

    // 4. Insert data into staging table
    if (products.length > 0) {
      console.log(`Inserting ${products.length} rows into ${STAGING_TABLE_NAME}...`);
      const { error: insertError } = await supabaseAdminClient
        .from(STAGING_TABLE_NAME)
        .insert(products);

      if (insertError) {
        console.error("Error inserting data:", insertError);
        throw new Error(`Failed to insert data: ${insertError.message}`);
      }
      console.log("Successfully inserted data into staging table.");
    } else {
      console.log("No products to insert.");
    }

    return new Response(
      JSON.stringify({ message: "Product import process completed successfully.", rowCount: products.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Overall import process error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred during import." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
