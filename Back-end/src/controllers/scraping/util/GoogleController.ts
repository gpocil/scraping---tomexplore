import { Request, Response } from 'express';
import axios from 'axios';
import { config } from '../../../config';

const RAPIDAPI_KEY = config.rapidApiKey;
const RAPIDAPI_HOST = 'google-maps-extractor2.p.rapidapi.com';

// Log API key status at startup (masked for security)
console.log(`[GoogleController] RAPID_API_KEY configured: ${RAPIDAPI_KEY ? 'YES (' + RAPIDAPI_KEY.substring(0, 8) + '...)' : 'NO'}`);

interface PhotoCategory {
  name: string;
  hash: string;
}

interface PhotoData {
  id: string;
  url: string;
  max_size: [number, number];
  date: string;
  aspect_ratio: number;
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface CategoriesResponse {
  status: boolean;
  data: PhotoCategory[];
}

interface PhotosResponse {
  status: boolean;
  data: PhotoData[];
  next_token?: string;
}

/**
 * Extract business_id from Google Maps URL
 * Format: 0x...:0x... found in the URL data parameter
 */
function extractBusinessId(url: string): string | null {
  // Pattern: !1s0x...:0x...
  const match = url.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
  if (match && match[1]) {
    console.log('Extracted business_id:', match[1]);
    return match[1];
  }
  
  // Alternative pattern in some URLs
  const altMatch = url.match(/(0x[0-9a-f]+:0x[0-9a-f]+)/i);
  if (altMatch && altMatch[1]) {
    console.log('Extracted business_id (alt):', altMatch[1]);
    return altMatch[1];
  }
  
  console.log('Could not extract business_id from URL:', url);
  return null;
}

/**
 * Get photo categories for a business
 */
async function getPhotoCategories(businessId: string): Promise<PhotoCategory[]> {
  console.log(`Fetching photo categories for business: ${businessId}`);
  
  const response = await axios.get<CategoriesResponse>(
    'https://google-maps-extractor2.p.rapidapi.com/business_photos_categories',
    {
      params: {
        business_id: businessId,
        lang: 'en',
        country: 'us'
      },
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY
      }
    }
  );

  if (response.data.status && response.data.data) {
    console.log('Categories found:', response.data.data.map(c => c.name).join(', '));
    return response.data.data;
  }
  
  console.log('No categories found');
  return [];
}

/**
 * Get photos for a specific category
 */
async function getPhotos(businessId: string, categoryHash: string, limit: number = 50): Promise<string[]> {
  console.log(`Fetching photos with hash: ${categoryHash}`);
  
  const response = await axios.get<PhotosResponse>(
    'https://google-maps-extractor2.p.rapidapi.com/business_photos',
    {
      params: {
        business_id: businessId,
        category: categoryHash,
        lang: 'en',
        country: 'us',
        limit: limit
      },
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY
      }
    }
  );

  if (response.data.status && response.data.data) {
    // Transform URLs to high resolution (replace thumbnail size with full size)
    const urls = response.data.data.map(photo => {
      // Get max resolution URL
      const baseUrl = photo.url.split('=')[0];
      return `${baseUrl}=s1200-k-no`;
    });
    console.log(`Found ${urls.length} photos`);
    return urls;
  }
  
  console.log('No photos found');
  return [];
}

/**
 * Main function to fetch Google Images from Business Page using RapidAPI
 */
export async function fetchGoogleImgsFromBusinessPage(req?: Request, res?: Response): Promise<{ urls: string[], count: number, error?: string }> {
  const { location_full_address } = req ? req.body : { location_full_address: '' };
  console.log('=== FETCH GOOGLE IMAGES (RapidAPI) ===');
  console.log('Location full address:', location_full_address);

  if (!location_full_address) {
    const error = 'location_full_address is required';
    console.error(error);
    if (res) res.status(400).json({ error });
    return { urls: [], count: 0, error };
  }

  if (!RAPIDAPI_KEY) {
    const error = 'RAPID_API_KEY is not configured';
    console.error(error);
    if (res) res.status(500).json({ error });
    return { urls: [], count: 0, error };
  }

  try {
    // Extract business_id from URL
    const businessId = extractBusinessId(location_full_address);
    
    if (!businessId) {
      const error = 'Could not extract business_id from URL. Make sure the URL contains a valid Google Maps place ID (format: 0x...:0x...)';
      console.error(error);
      if (res) res.status(400).json({ error });
      return { urls: [], count: 0, error };
    }

    // Step 1: Get photo categories
    const categories = await getPhotoCategories(businessId);
    
    // Step 2: Find "By owner" category
    const byOwnerCategory = categories.find(cat => 
      cat.name.toLowerCase() === 'by owner' || 
      cat.name.toLowerCase().includes('owner')
    );

    if (!byOwnerCategory) {
      const error = 'No "By owner" category found for this business';
      console.log(error);
      console.log('Available categories:', categories.map(c => c.name).join(', '));
      if (res) res.json({ urls: [], count: 0, error });
      return { urls: [], count: 0, error };
    }

    console.log(`Found "By owner" category with hash: ${byOwnerCategory.hash}`);

    // Step 3: Get photos from "By owner" category
    const urls = await getPhotos(businessId, byOwnerCategory.hash);

    const result = { urls, count: urls.length };
    console.log(`✓ Successfully fetched ${result.count} owner photos`);
    
    if (res) res.json(result);
    return result;

  } catch (error: any) {
    console.error('Error fetching Google images:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    const errorMessage = `Error fetching Google images: ${error.message}`;
    if (res) res.status(500).json({ error: errorMessage });
    return { urls: [], count: 0, error: errorMessage };
  }
}

/**
 * Fetch Google Business Attributes (not implemented with RapidAPI yet)
 */
export async function fetchGoogleBusinessAttributes(req: Request, res: Response) {
  const { location_full_address } = req.body;
  console.log('=== FETCH GOOGLE BUSINESS ATTRIBUTES ===');
  console.log('Location:', location_full_address);
  
  // This functionality can be implemented later with the RapidAPI
  const result = { attributes: {}, count: 0, error: 'Not implemented with new API' };
  res.json(result);
  return result;
}

/**
 * Get original name of a place (not implemented with RapidAPI yet)
 */
export async function getOriginalName(req: Request, res?: Response): Promise<string> {
  const { location_full_address } = req.body;
  console.log('=== GET ORIGINAL NAME ===');
  console.log('Location:', location_full_address);
  
  // For now, return empty string - this can be implemented later with RapidAPI
  const name = '';
  
  if (res) res.json({ name });
  return name;
}
