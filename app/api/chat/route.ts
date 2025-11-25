import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please check your .env.local file.' },
        { status: 500 }
      );
    }
    
    // Initialize OpenAI client inside the function to ensure env var is loaded
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Get latest skin analysis
    const { data: analysis } = await supabase
      .from('skin_analysis')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Build system prompt with skin analysis data
    let systemPrompt = 'You are a friendly and knowledgeable skincare advisor. You help users understand their skin type and provide personalized skincare advice. Be warm, professional, and focus on natural, healthy skincare practices.';
    
    if (analysis) {
      systemPrompt += `\n\nUser's Skin Profile:
- Age: ${analysis.age}
- Skin Type: ${analysis.skin_type}
- Sensitivity: ${analysis.sensitivity}
- Firmness Score: ${analysis.firmness}/10
- Radiance Score: ${analysis.radiance}/10
- Dark Spots Score: ${analysis.dark_spots}/10

Use this information to provide personalized skincare recommendations. 

When the user asks for a skincare routine (or if this is their first message), provide a comprehensive, detailed skincare routine that includes:
1. Morning routine (cleanser, toner, serum, moisturizer, sunscreen)
2. Evening routine (cleanser, treatment products, moisturizer)
3. Weekly treatments (masks, exfoliants)
4. Product recommendations based on their skin type, age, and concerns
5. Tips specific to their skin condition

Make the routine detailed, practical, and personalized to their specific skin profile. Use the ratings (firmness, radiance, dark spots) to address their specific concerns.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      temperature: 0.7,
    });

    return NextResponse.json({
      message: completion.choices[0].message.content,
    });
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Handle OpenAI API errors
    let errorMessage = 'Failed to get response from OpenAI';
    let statusCode = 500;
    
    if (error?.status) {
      statusCode = error.status;
      if (error.status === 401) {
        errorMessage = 'Invalid API key. Please check your OpenAI API key in .env.local';
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.status === 400) {
        errorMessage = error?.message || 'Invalid request. Please check your input.';
      } else if (error.status === 500) {
        errorMessage = 'OpenAI service error. Please try again later.';
      } else {
        errorMessage = error?.message || `OpenAI API error (status: ${error.status})`;
      }
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

