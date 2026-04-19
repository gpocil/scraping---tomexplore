import { Request, Response } from 'express';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as ProxyController from '../ProxyController';
import { config } from '../../../config';

function getProxyAgent(): HttpsProxyAgent<string> | undefined {
    const proxy = ProxyController.getRandomProxy();
    if (proxy.address) {
        return new HttpsProxyAgent(`http://${proxy.username}:${proxy.pw}@${proxy.address}`);
    }
    return undefined;
}

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
 * Supports legacy hex FID (0x...:0x...) and modern Place ID (ChIJ...)
 */
function extractBusinessId(url: string): string | null {
  // Pattern: !1s0x...:0x... (legacy hex FID in place URL)
  const hexMatch = url.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
  if (hexMatch && hexMatch[1]) {
    console.log('Extracted business_id (hex FID):', hexMatch[1]);
    return hexMatch[1];
  }

  // Pattern: place_id:ChIJ... or ?q=place_id:ChIJ...
  const placeIdMatch = url.match(/place_id[:=]([A-Za-z0-9_-]{20,})/);
  if (placeIdMatch && placeIdMatch[1]) {
    console.log('Extracted business_id (Place ID):', placeIdMatch[1]);
    return placeIdMatch[1];
  }

  // Alternative hex pattern without !1s prefix
  const altHexMatch = url.match(/(0x[0-9a-f]+:0x[0-9a-f]+)/i);
  if (altHexMatch && altHexMatch[1]) {
    console.log('Extracted business_id (hex alt):', altHexMatch[1]);
    return altHexMatch[1];
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
      },
      httpsAgent: getProxyAgent()
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
      },
      httpsAgent: getProxyAgent()
    }
  );

  if (response.data.status && response.data.data) {
    if (response.data.data.length > 0) {
      console.log(`[GoogleController] First raw URL from API: ${response.data.data[0].url}`);
    }
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
export async function fetchGoogleImgsFromBusinessPage(req?: Request, res?: Response): Promise<{ urls: string[], count: number, category?: string, error?: string }> {
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

    if (categories.length === 0) {
      const error = 'No photo categories available for this business';
      console.log(error);
      if (res) res.json({ urls: [], count: 0, error });
      return { urls: [], count: 0, error };
    }

    // Step 2: Try "By owner" first
    const byOwnerCategory = categories.find(cat =>
      cat.name.toLowerCase() === 'by owner' ||
      cat.name.toLowerCase().includes('owner')
    );

    let urls: string[] = [];
    let usedCategoryName = '';

    if (byOwnerCategory) {
      console.log(`Found "By owner" category with hash: ${byOwnerCategory.hash}`);
      urls = await getPhotos(businessId, byOwnerCategory.hash);
      usedCategoryName = byOwnerCategory.name;
    } else {
      console.log('No "By owner" category found. Available categories:', categories.map(c => c.name).join(', '));
    }

    // Step 3: Fallback to "All" if By owner missing or returned nothing
    if (urls.length === 0) {
      const allCategory = categories.find(cat => {
        const n = cat.name.toLowerCase();
        return n === 'all' || n === 'tout' || n === 'todas' || n === 'alle';
      }) || categories[0];

      if (allCategory && allCategory.hash !== byOwnerCategory?.hash) {
        console.log(`Falling back to category "${allCategory.name}" with hash: ${allCategory.hash}`);
        urls = await getPhotos(businessId, allCategory.hash);
        usedCategoryName = allCategory.name;
      }
    }

    const result = { urls, count: urls.length, category: usedCategoryName };
    console.log(`✓ Successfully fetched ${result.count} photos from category "${usedCategoryName}"`);

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
