export interface CityPreset {
  city: string;
  latitude: number;
  longitude: number;
  tiltAngle: number;
  endAltitude: number;
  description: string;
}

export const PRESETS: CityPreset[] = [
  {
    city: "New York",
    latitude: 40.7128,
    longitude: -74.006,
    tiltAngle: 45,
    endAltitude: 2000,
    description: "Manhattan skyline with a 45-degree tilt for dramatic skyscraper views",
  },
  {
    city: "Chicago",
    latitude: 41.8781,
    longitude: -87.6298,
    tiltAngle: 40,
    endAltitude: 2000,
    description: "Lake Michigan waterfront and downtown loop from a moderate angle",
  },
  {
    city: "London",
    latitude: 51.5074,
    longitude: -0.1278,
    tiltAngle: 35,
    endAltitude: 1500,
    description: "Thames river corridor with gentle tilt showcasing historic landmarks",
  },
  {
    city: "Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
    tiltAngle: 50,
    endAltitude: 2500,
    description: "Dense urban sprawl with steep tilt for depth perception",
  },
  {
    city: "Dubai",
    latitude: 25.2048,
    longitude: 55.2708,
    tiltAngle: 45,
    endAltitude: 3000,
    description: "Burj Khalifa and Palm Jumeirah from an elevated perspective",
  },
  {
    city: "San Francisco",
    latitude: 37.7749,
    longitude: -122.4194,
    tiltAngle: 40,
    endAltitude: 1800,
    description: "Bay Area with Golden Gate Bridge at a cinematic angle",
  },
  {
    city: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    tiltAngle: 35,
    endAltitude: 1500,
    description: "City of Light from a gentle angle highlighting the Seine",
  },
  {
    city: "Sydney",
    latitude: -33.8688,
    longitude: 151.2093,
    tiltAngle: 45,
    endAltitude: 2000,
    description: "Opera House and Harbour Bridge from a dramatic harbor approach",
  },
];
