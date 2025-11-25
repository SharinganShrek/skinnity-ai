import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // First, check if a face is visible in the image
    const faceCheckCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an image analysis expert. Look at the provided image and determine if a human face is clearly visible and suitable for skincare analysis.

Return ONLY a JSON object with this exact format:
{
  "has_face": true or false,
  "is_clear": true or false
}

- "has_face": true if you can clearly see a human face in the image, false otherwise
- "is_clear": true if the face is clear enough for analysis (good lighting, in focus, not obscured), false otherwise

If there is no face, multiple faces, the face is too small, or the image is not of a face, return has_face: false.
Do not include any other text, explanations, or markdown formatting. Only return the JSON object.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 100,
    });

    const faceCheckText = faceCheckCompletion.choices[0].message.content?.trim() || '{}';
    let faceCheck;
    try {
      const cleaned = faceCheckText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      faceCheck = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Failed to parse face check:', faceCheckText);
      // Continue with analysis if face check fails to parse
    }

    // Check if face is detected and clear
    if (faceCheck && (!faceCheck.has_face || !faceCheck.is_clear)) {
      return NextResponse.json(
        { 
          error: 'NO_FACE_DETECTED',
          message: 'We couldn\'t detect a clear face in your image. Please upload a clear, well-lit photo of your face looking straight at the camera.'
        },
        { status: 400 }
      );
    }

    // Analyze image with GPT-4o-mini vision
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a skincare analysis expert. Analyze the provided face image and rate the following metrics on a scale of 0-10 with one decimal place:
- Firmness: How firm and elastic the skin appears (0 = very loose, 10 = very firm)
- Radiance: How bright and glowing the skin appears (0 = very dull, 10 = very radiant)
- Dark spots: The presence and severity of dark spots/hyperpigmentation (0 = no dark spots, 10 = many/severe dark spots)

Return ONLY a JSON object with this exact format:
{
  "firmness": 7.5,
  "radiance": 6.2,
  "dark_spots": 3.1
}

Do not include any other text, explanations, or markdown formatting. Only return the JSON object.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 150,
    });

    const responseText = completion.choices[0].message.content?.trim() || '{}';
    
    // Parse JSON response (handle markdown code blocks if present)
    let analysis;
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Failed to parse analysis:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse analysis response' },
        { status: 500 }
      );
    }

    // Validate analysis data
    if (
      typeof analysis.firmness !== 'number' ||
      typeof analysis.radiance !== 'number' ||
      typeof analysis.dark_spots !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid analysis data received' },
        { status: 500 }
      );
    }

    // Return analysis (we'll save it after questionnaire is completed)
    return NextResponse.json({
      firmness: Math.round(analysis.firmness * 10) / 10,
      radiance: Math.round(analysis.radiance * 10) / 10,
      dark_spots: Math.round(analysis.dark_spots * 10) / 10,
    });
  } catch (error: any) {
    console.error('Skin analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze skin' },
      { status: 500 }
    );
  }
}

