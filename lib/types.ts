// Core domain types for the Manhattan rental platform

export type Neighborhood = {
  id: string;
  slug: string;
  name: string;
  borough: string;
  description: string | null;
  avg_rent: number | null;
  latitude: number | null;
  longitude: number | null;
  hero_image: string | null;
  highlights: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  faqs: FaqItem[] | null;
  restaurants: string[] | null;
  coffee_shops: string[] | null;
  parks: string[] | null;
  schools: string[] | null;
  lifestyle: string[] | null;
  transportation: string[] | null;
  created_at: string;
  updated_at: string;
};

export type Building = {
  id: string;
  slug: string;
  name: string;
  neighborhood_id: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  building_type: string | null;
  amenities: string[] | null;
  year_built: number | null;
  floors: number | null;
  hero_image: string | null;
  gallery: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  faqs: FaqItem[] | null;
  nearby_subway: string[] | null;
  nearby_grocery: string[] | null;
  nearby_restaurants: string[] | null;
  transportation: string[] | null;
  neighborhood_summary: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
  neighborhoods?: Neighborhood | null;
};

export type Listing = {
  id: string;
  slug: string;
  title: string;
  building_id: string | null;
  neighborhood_id: string | null;
  unit_number: string | null;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number | null;
  furnished: boolean;
  pet_policy: string;
  move_in_date: string | null;
  lease_term_months: number | null;
  listing_type: string;
  status: string;
  description: string | null;
  images: string[] | null;
  amenities: string[] | null;
  latitude: number | null;
  longitude: number | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  buildings?: Building | null;
  neighborhoods?: Neighborhood | null;
};

export type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type Amenity = {
  id: string;
  name: string;
  icon: string | null;
  category: string;
};

export type Favorite = {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
};

export type PropertySubmission = {
  id: string;
  user_id: string | null;
  submission_data: Record<string, any>;
  status: string;
  listing_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type SearchFilters = {
  neighborhood?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  bathrooms?: string;
  petPolicy?: string;
  furnished?: string;
  moveInDate?: string;
  leaseTerm?: string;
  listingType?: string;
  sort?: string;
  q?: string;
};

export const PET_POLICY_LABELS: Record<string, string> = {
  pets_allowed: 'Pets Allowed',
  no_pets: 'No Pets',
  cats_only: 'Cats Only',
  dogs_only: 'Dogs Only',
};

export const LISTING_TYPE_LABELS: Record<string, string> = {
  rental: 'Rental',
  short_stay: 'Short Stay',
  shared_living: 'Shared Living',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  inactive: 'Inactive',
  rejected: 'Rejected',
};

export const LEASE_TERM_OPTIONS = [
  { value: '1', label: '1 Month' },
  { value: '3', label: '3 Months' },
  { value: '6', label: '6 Months' },
  { value: '12', label: '12 Months' },
  { value: '24', label: '24 Months' },
];

export const BEDROOM_OPTIONS = [
  { value: '0', label: 'Studio' },
  { value: '1', label: '1 Bed' },
  { value: '2', label: '2 Beds' },
  { value: '3', label: '3 Beds' },
  { value: '4', label: '4+ Beds' },
];

export const BATHROOM_OPTIONS = [
  { value: '1', label: '1 Bath' },
  { value: '1.5', label: '1.5 Baths' },
  { value: '2', label: '2 Baths' },
  { value: '3', label: '3+ Baths' },
];

export const PET_POLICY_OPTIONS = [
  { value: 'pets_allowed', label: 'Pets Allowed' },
  { value: 'no_pets', label: 'No Pets' },
  { value: 'cats_only', label: 'Cats Only' },
  { value: 'dogs_only', label: 'Dogs Only' },
];

export const PRICE_OPTIONS = [
  { value: '1000', label: '$1,000' },
  { value: '2000', label: '$2,000' },
  { value: '3000', label: '$3,000' },
  { value: '4000', label: '$4,000' },
  { value: '5000', label: '$5,000' },
  { value: '6000', label: '$6,000' },
  { value: '8000', label: '$8,000' },
  { value: '10000', label: '$10,000+' },
];
