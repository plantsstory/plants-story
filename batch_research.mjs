const SUPABASE_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';

// Fetch all cultivars
const res = await fetch(`${SUPABASE_URL}/rest/v1/cultivars?select=id,cultivar_name,genus,type&order=id`, {
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
});
const cultivars = await res.json();
console.log(`Starting batch research for ${cultivars.length} cultivars...\n`);

let success = 0;
let fail = 0;

for (const c of cultivars) {
  process.stdout.write(`[${c.id}] ${c.cultivar_name} (${c.type})... `);

  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/research-origin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        cultivar_id: c.id,
        cultivar_name: c.cultivar_name,
        genus: c.genus,
        type: c.type
      })
    });
    const data = await r.json();

    if (data.success) {
      console.log(`✅ ${data.research_source} trust:${data.best_trust}%`);
      success++;
    } else {
      console.log(`❌ ${data.error || 'unknown error'}`);
      fail++;
    }
  } catch (e) {
    console.log(`❌ ${e.message}`);
    fail++;
  }

  // Rate limit: 3 seconds between requests
  await new Promise(r => setTimeout(r, 3000));
}

console.log(`\n=== Done: ${success} success, ${fail} failed ===`);
