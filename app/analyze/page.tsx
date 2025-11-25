'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type SkinType = 'oily' | 'neutral' | 'dry' | '';
type Sensitivity = 'sensitive' | 'neutral' | 'not_sensitive' | '';

export default function AnalyzePage() {
  const [step, setStep] = useState<'upload' | 'questionnaire' | 'analyzing' | 'results'>('upload');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [age, setAge] = useState('');
  const [skinType, setSkinType] = useState<SkinType>('');
  const [sensitivity, setSensitivity] = useState<Sensitivity>('');
  const [analysis, setAnalysis] = useState<{
    firmness: number;
    radiance: number;
    dark_spots: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    setImage(file);
    setError(null);

    // Create preview and store base64 for later analysis
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleContinueToQuestionnaire = () => {
    if (!image) return;
    // Just check if image is selected, face check will happen during analysis
    setStep('questionnaire');
  };

  const handleAnalyze = async () => {
    if (!image || !imageBase64 || !age || !skinType || !sensitivity) return;

    setLoading(true);
    setError(null);
    setStep('analyzing');

    try {
      // Convert base64 to blob for FormData
      const response = await fetch(imageBase64);
      const blob = await response.blob();
      const file = new File([blob], 'image.jpg', { type: blob.type });

      const formData = new FormData();
      formData.append('image', file);

      const analyzeResponse = await fetch('/api/analyze-skin', {
        method: 'POST',
        body: formData,
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        // Check if it's a "no face detected" error
        if (errorData.error === 'NO_FACE_DETECTED') {
          throw new Error(errorData.message || 'No face detected in the image. Please upload a clear photo of your face.');
        }
        throw new Error(errorData.error || errorData.message || 'Failed to analyze image');
      }

      const data = await analyzeResponse.json();
      setAnalysis(data);
      setStep('results');
    } catch (err: any) {
      setError(err.message || 'Failed to analyze image');
      setStep('questionnaire');
      // Clear the image preview if face detection failed
      if (err.message?.includes('face') || err.message?.includes('No face')) {
        setImage(null);
        setImagePreview(null);
        setImageBase64(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setStep('upload');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!analysis || !age || !skinType || !sensitivity) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/save-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          age,
          skin_type: skinType,
          sensitivity,
          firmness: analysis.firmness,
          radiance: analysis.radiance,
          dark_spots: analysis.dark_spots,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.hint 
          ? `${errorData.error}\n\n${errorData.hint}`
          : errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to save analysis';
        throw new Error(errorMessage);
      }

      // Navigate to chat
      router.push('/');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save analysis';
      setError(errorMessage);
      console.error('Save analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white/80 backdrop-blur-sm shadow-2xl border border-emerald-100/50 p-8">
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-semibold text-emerald-900 mb-2">
                📸 Upload Your Photo
              </h1>
              <p className="text-emerald-700">
                Upload a clear photo of your face for AI analysis
              </p>
            </div>

            {error && (
              <div className={`p-4 rounded-lg border-2 ${
                error.includes('face') || error.includes('No face') || error.includes('detect')
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">
                    {error.includes('face') || error.includes('No face') || error.includes('detect') ? '📷' : '⚠️'}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium mb-1">
                      {error.includes('face') || error.includes('No face') || error.includes('detect')
                        ? 'Face Not Detected' 
                        : 'Error'}
                    </p>
                    <p className="text-sm leading-relaxed">{error}</p>
                    {(error.includes('face') || error.includes('No face') || error.includes('detect')) && (
                      <div className="mt-3 text-xs text-amber-700">
                        <p className="font-medium mb-1">Tips for a good photo:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Make sure your face is clearly visible</li>
                          <li>Use good lighting (natural light is best)</li>
                          <li>Look straight at the camera</li>
                          <li>Remove glasses or anything covering your face</li>
                          <li>Ensure the photo is in focus</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center space-y-4">
              {imagePreview ? (
                <div className="relative w-full max-w-md">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-auto rounded-xl border-2 border-emerald-200"
                  />
                  <button
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-md border-2 border-dashed border-emerald-300 rounded-xl p-12 text-center cursor-pointer hover:bg-emerald-50 transition-colors"
                >
                  <div className="text-4xl mb-4">📷</div>
                  <p className="text-emerald-700 font-medium mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-emerald-600">
                    Max file size: 10MB
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {image && (
                <button
                  onClick={handleContinueToQuestionnaire}
                  disabled={loading}
                  className="w-full max-w-md rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-medium text-white transition-all hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="text-center space-y-4 py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-semibold text-emerald-900">
              Analyzing your skin...
            </h2>
            <p className="text-emerald-700">This may take a few moments</p>
            <div className="flex justify-center space-x-2 mt-8">
              <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}

        {step === 'questionnaire' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-semibold text-emerald-900 mb-2">
                📋 Tell Us About Your Skin
              </h1>
              <p className="text-emerald-700">
                Help us personalize your skincare routine
              </p>
            </div>

            {error && (
              <div className={`p-4 rounded-lg border-2 ${
                error.includes('face') || error.includes('No face') || error.includes('detect')
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">
                    {error.includes('face') || error.includes('No face') || error.includes('detect') ? '📷' : '⚠️'}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium mb-1">
                      {error.includes('face') || error.includes('No face') || error.includes('detect')
                        ? 'Face Not Detected' 
                        : 'Error'}
                    </p>
                    <p className="text-sm leading-relaxed">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter your age"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-2">
                  Skin Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['oily', 'neutral', 'dry'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSkinType(type)}
                      className={`px-4 py-3 rounded-xl border-2 transition-all ${
                        skinType === type
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-medium'
                          : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-2">
                  Sensitivity
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['sensitive', 'neutral', 'not_sensitive'] as const).map((sens) => (
                    <button
                      key={sens}
                      onClick={() => setSensitivity(sens)}
                      className={`px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                        sensitivity === sens
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-medium'
                          : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {sens === 'not_sensitive' ? 'Not Sensitive' : sens.charAt(0).toUpperCase() + sens.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !age || !skinType || !sensitivity || !image}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-medium text-white transition-all hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Analyzing...' : 'Analyze My Skin'}
            </button>
          </div>
        )}

        {step === 'results' && analysis && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-semibold text-emerald-900 mb-2">
                ✨ Your Skin Analysis Results
              </h1>
              <p className="text-emerald-700">
                Here's what we found about your skin
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200">
              <h3 className="font-semibold text-emerald-900 mb-4 text-center">Skin Ratings</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-700 mb-1">{analysis.firmness}</div>
                  <div className="text-xs text-emerald-600">Firmness</div>
                  <div className="text-xs text-emerald-500">/10</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-700 mb-1">{analysis.radiance}</div>
                  <div className="text-xs text-emerald-600">Radiance</div>
                  <div className="text-xs text-emerald-500">/10</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-700 mb-1">{analysis.dark_spots}</div>
                  <div className="text-xs text-emerald-600">Dark Spots</div>
                  <div className="text-xs text-emerald-500">/10</div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <h3 className="font-medium text-emerald-900 mb-2">Your Profile:</h3>
              <div className="space-y-1 text-sm text-emerald-700">
                <p><span className="font-medium">Age:</span> {age}</p>
                <p><span className="font-medium">Skin Type:</span> {skinType.charAt(0).toUpperCase() + skinType.slice(1)}</p>
                <p><span className="font-medium">Sensitivity:</span> {sensitivity === 'not_sensitive' ? 'Not Sensitive' : sensitivity.charAt(0).toUpperCase() + sensitivity.slice(1)}</p>
              </div>
            </div>

            <button
              onClick={handleSaveAnalysis}
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-medium text-white transition-all hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Saving...' : 'Continue to Chatbot'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

