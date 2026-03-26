// Remove size information from existing cultivar descriptions
// Runs one cultivar at a time with 15-second intervals

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Patterns to remove size-related text (Japanese and English)
const SIZE_PATTERNS_JP = [
  // 「成熟した葉は長さ30-40cmに達し、コンパクトな株姿を保つ。」
  /[、。]?[^、。]*(?:長さ|幅|高さ|大きさ|サイズ|直径)[^、。]*\d+[^、。]*(?:cm|mm|m|センチ|ミリ|メートル)[^、。]*[、。]?/g,
  // 「XX-XXcm」を含む文節
  /[、。]?[^、。]*\d+\s*[-〜~～]\s*\d+\s*(?:cm|mm|m)[^、。]*[、。]?/g,
  // 「約XXcm」「XXcm程度」
  /[、。]?[^、。]*(?:約)?\d+\s*(?:cm|mm|m)\s*(?:に達し|に達する|程度|ほど|前後|以上|以下|未満)[^、。]*[、。]?/g,
];

const SIZE_PATTERNS_EN = [
  // "reaching 30-40cm" "up to 1m tall" "30-40 cm long"
  /,?\s*(?:reaching|up to|about|approximately|growing to|can grow to|attaining)\s+\d+[-–]?\d*\s*(?:cm|mm|m|inches?|feet|ft)\s*(?:long|wide|tall|in (?:length|width|height|diameter))?\s*,?/gi,
  // "leaves are 30cm long" "30 cm in length"
  /,?\s*\d+\s*[-–]?\s*\d*\s*(?:cm|mm|m)\s+(?:long|wide|tall|in (?:length|width|height|diameter))\s*,?/gi,
  // "30-40 cm" standalone with context
  /,?\s*(?:measuring|about|approximately|around)?\s*\d+[-–]\d+\s*(?:cm|mm|m)\s*(?:long|wide|tall|in (?:length|width|height|diameter))?\s*,?/gi,
];

function removeSizeInfo(text, patterns) {
  if (!text) return text;
  let cleaned = text;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  // Clean up double punctuation and spaces
  cleaned = cleaned.replace(/、、+/g, '、');
  cleaned = cleaned.replace(/。。+/g, '。');
  cleaned = cleaned.replace(/、。/g, '。');
  cleaned = cleaned.replace(/。、/g, '。');
  cleaned = cleaned.replace(/,\s*,/g, ',');
  cleaned = cleaned.replace(/\.\s*\./g, '.');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.trim();
  // Remove leading punctuation
  cleaned = cleaned.replace(/^[、,]\s*/, '');
  return cleaned;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Fetching all cultivars...');
  const { data: cultivars, error } = await supabase
    .from('cultivars')
    .select('id, cultivar_name, origins');

  if (error) {
    console.error('Failed to fetch cultivars:', error);
    process.exit(1);
  }

  console.log(`Found ${cultivars.length} cultivars`);

  let updated = 0;
  let skipped = 0;

  for (const cultivar of cultivars) {
    if (!cultivar.origins || !Array.isArray(cultivar.origins) || cultivar.origins.length === 0) {
      skipped++;
      continue;
    }

    let changed = false;
    const newOrigins = cultivar.origins.map(origin => {
      const newBody = removeSizeInfo(origin.body, SIZE_PATTERNS_JP);
      const newBodyEn = removeSizeInfo(origin.body_en, SIZE_PATTERNS_EN);

      if (newBody !== origin.body || newBodyEn !== origin.body_en) {
        changed = true;
        return { ...origin, body: newBody, body_en: newBodyEn };
      }
      return origin;
    });

    if (changed) {
      console.log(`\n[${updated + 1}] Updating: ${cultivar.cultivar_name}`);
      for (let i = 0; i < cultivar.origins.length; i++) {
        const orig = cultivar.origins[i]?.body || '';
        const newText = newOrigins[i]?.body || '';
        if (orig !== newText) {
          console.log(`  JP Before: ${orig}`);
          console.log(`  JP After:  ${newText}`);
        }
        const origEn = cultivar.origins[i]?.body_en || '';
        const newTextEn = newOrigins[i]?.body_en || '';
        if (origEn !== newTextEn) {
          console.log(`  EN Before: ${origEn.substring(0, 100)}...`);
          console.log(`  EN After:  ${newTextEn.substring(0, 100)}...`);
        }
      }

      const { error: updateError } = await supabase
        .from('cultivars')
        .update({ origins: newOrigins })
        .eq('id', cultivar.id);

      if (updateError) {
        console.error(`  ERROR: ${updateError.message}`);
      } else {
        updated++;
        console.log(`  OK`);
      }

      // Wait 15 seconds before next update
      if (updated < cultivars.length) {
        console.log('  Waiting 15 seconds...');
        await sleep(15000);
      }
    } else {
      skipped++;
    }
  }

  console.log(`\nDone! Updated: ${updated}, Skipped (no size info): ${skipped}`);
}

main();
