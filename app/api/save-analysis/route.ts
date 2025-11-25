import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { age, skin_type, sensitivity, firmness, radiance, dark_spots } = body;

    // Validate required fields
    if (
      !age ||
      !skin_type ||
      !sensitivity ||
      firmness === undefined ||
      radiance === undefined ||
      dark_spots === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Delete previous analysis for this user (keep only latest)
    await supabase
      .from('skin_analysis')
      .delete()
      .eq('user_id', user.id);

    // Insert new analysis
    const { data, error } = await supabase
      .from('skin_analysis')
      .insert({
        user_id: user.id,
        age: parseInt(age),
        skin_type,
        sensitivity,
        firmness: parseFloat(firmness),
        radiance: parseFloat(radiance),
        dark_spots: parseFloat(dark_spots),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      // Return more detailed error message for debugging
      return NextResponse.json(
        { 
          error: 'Failed to save analysis',
          details: error.message,
          hint: error.message?.includes('relation') || error.message?.includes('does not exist') 
            ? 'Database tables may not exist. Please run the SQL schema in Supabase.' 
            : null
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Save analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save analysis' },
      { status: 500 }
    );
  }
}

