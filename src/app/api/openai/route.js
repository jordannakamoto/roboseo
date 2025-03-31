import { NextResponse } from 'next/server';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req) {
  try {
    const body = await req.json();
    const { option, images, keywords = [], currentValue = '' } = body;

    const promptPath = path.join(process.cwd(), 'src', 'prompts', `${option}.txt`);
    let promptTemplate;

    try {
      promptTemplate = await fs.readFile(promptPath, 'utf-8');
    } catch (err) {
      return NextResponse.json({ error: `Prompt file not found for option: ${option}` }, { status: 400 });
    }

    if (option === 'generate-alt-text') {
      const generateAltText = async (description) => {
        const prompt = promptTemplate
          .replace('{description}', description)
          .replace('{keywords}', keywords);

        try {
          const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are a helpful SEO assistant.' },
                { role: 'user', content: prompt },
              ],
              temperature: 0.7,
              max_tokens: 125,
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
            }
          );

          return response.data.choices[0].message.content.trim();
        } catch (error) {
          console.error('OpenAI error:', description, error.response?.data || error.message);
          return null;
        }
      };

      const altTexts = await Promise.all(
        images.map(async (img) => ({
          url: img.url,
          altText: (await generateAltText(img.description)) || 'Failed to generate alt text',
        }))
      );

      return NextResponse.json({ altTexts });
    } else {
      const prompt = `${promptTemplate}
      
      Generate 3 variations of the response, structured as follows:
      1. {response1}
      2. {response2}
      3. {response3}`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert SEO optimization bot.' },
            { role: 'user', content: prompt.replace('{keywords}', keywords.join(', ')).replace('{currentValue}', currentValue) },
          ],
          temperature: 0.7,
          max_tokens: 300,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      const rawResponse = response.data.choices[0].message.content.trim();
      const generatedOptions = rawResponse
        .split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(option => option.length > 0);

      return NextResponse.json({ generatedOptions });
    }
  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Alt text generation endpoint.' }, { status: 200 });
}