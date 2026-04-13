export interface Profile {
  id: number;
  name: string;
  image: string;
  age?: number;        // voliteľné, ak niekde nemáš
  city?: string;       // voliteľné
  bio?: string;        // voliteľné
  tags?: string[];     // voliteľné
}
