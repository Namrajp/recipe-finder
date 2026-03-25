export interface Recipe {
  id: string;
  title: string;
  description: string;
  cookTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: string[];
  instructions: string[];
  imageUrl?: string;
}

export interface RecipeResponse {
  recipes: Recipe[];
  cached: boolean;
}

export interface BookmarkedRecipe extends Recipe {
  bookmarkedAt: number;
}
