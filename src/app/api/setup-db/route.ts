import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * One-time setup: Creates missing database tables via Supabase service role.
 * DELETE THIS FILE after running it once.
 * Run: curl -X POST http://localhost:3000/api/setup-db
 */
export async function POST() {
  try {
    return NextResponse.json({
      success: false,
      message: "Please run the SQL migration manually in your Supabase Dashboard.",
      instructions: [
        "1. Go to https://supabase.com/dashboard/project/koucyokdqncnywzzwmow",
        "2. Click 'SQL Editor' in the left sidebar",
        "3. Copy and run the contents of supabase/migrations/001_create_missing_tables.sql",
        "4. After running, all features will work.",
      ],
      sqlFile: "supabase/migrations/001_create_missing_tables.sql",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
