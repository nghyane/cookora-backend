import { relations } from "drizzle-orm";
import {
  users,
  authProviders,
  sessions,
  userFavorites,
  pantryItems,
  pantryFollowers,
} from "./users";
import { recipes, recipeIngredients, recipeInstructions } from "./recipes";
import { ingredients } from "./ingredients";
import {
  posts,
  comments,
  postLikes,
  commentLikes,
  userFollows,
  postCategories,
  postShares,
  postViews,
  savedPosts,
} from "./community";

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  authProviders: many(authProviders),
  sessions: many(sessions),
  favorites: many(userFavorites),
  pantryItems: many(pantryItems),
  pantryFollowers: many(pantryFollowers, { relationName: "pantryOwner" }),
  pantryFollowing: many(pantryFollowers, { relationName: "follower" }),
  posts: many(posts),
  comments: many(comments),
  postLikes: many(postLikes),
  commentLikes: many(commentLikes),
  followers: many(userFollows, { relationName: "following" }),
  following: many(userFollows, { relationName: "follower" }),
  savedPosts: many(savedPosts),
}));

// Auth provider relations
export const authProvidersRelations = relations(authProviders, ({ one }) => ({
  user: one(users, {
    fields: [authProviders.userId],
    references: [users.id],
  }),
}));

// Session relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// User favorites relations
export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
  recipe: one(recipes, {
    fields: [userFavorites.recipeId],
    references: [recipes.id],
  }),
}));

// Pantry items relations
export const pantryItemsRelations = relations(pantryItems, ({ one }) => ({
  user: one(users, {
    fields: [pantryItems.userId],
    references: [users.id],
  }),
  addedByUser: one(users, {
    fields: [pantryItems.addedBy],
    references: [users.id],
  }),
  ingredient: one(ingredients, {
    fields: [pantryItems.ingredientId],
    references: [ingredients.id],
  }),
}));

// Pantry followers relations
export const pantryFollowersRelations = relations(
  pantryFollowers,
  ({ one }) => ({
    pantryOwner: one(users, {
      fields: [pantryFollowers.pantryOwnerId],
      references: [users.id],
      relationName: "pantryOwner",
    }),
    follower: one(users, {
      fields: [pantryFollowers.followerId],
      references: [users.id],
      relationName: "follower",
    }),
  }),
);

// Recipe relations
export const recipesRelations = relations(recipes, ({ many }) => ({
  favoritedBy: many(userFavorites),
  ingredients: many(recipeIngredients),
  instructions: many(recipeInstructions),
}));

// Recipe ingredients relations
export const recipeIngredientsRelations = relations(
  recipeIngredients,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipeIngredients.recipeId],
      references: [recipes.id],
    }),
    ingredient: one(ingredients, {
      fields: [recipeIngredients.ingredientId],
      references: [ingredients.id],
    }),
  }),
);

// Recipe instructions relations
export const recipeInstructionsRelations = relations(
  recipeInstructions,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipeInstructions.recipeId],
      references: [recipes.id],
    }),
  }),
);

// Ingredient relations
export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  usedInRecipes: many(recipeIngredients),
  inPantries: many(pantryItems),
}));

// Post category relations
export const postCategoriesRelations = relations(
  postCategories,
  ({ many, one }) => ({
    posts: many(posts),
    parent: one(postCategories, {
      fields: [postCategories.parentId],
      references: [postCategories.id],
    }),
    children: many(postCategories),
  }),
);

// Post relations
export const postsRelations = relations(posts, ({ many, one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  category: one(postCategories, {
    fields: [posts.categoryId],
    references: [postCategories.id],
  }),
  comments: many(comments),
  likes: many(postLikes),
  shares: many(postShares),
  views: many(postViews),
  savedBy: many(savedPosts),
}));

// Comment relations
export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: many(comments),
  likes: many(commentLikes),
  moderator: one(users, {
    fields: [comments.moderatedBy],
    references: [users.id],
  }),
}));

// Post likes relations
export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, {
    fields: [postLikes.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [postLikes.userId],
    references: [users.id],
  }),
}));

// Comment likes relations
export const commentLikesRelations = relations(commentLikes, ({ one }) => ({
  comment: one(comments, {
    fields: [commentLikes.commentId],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [commentLikes.userId],
    references: [users.id],
  }),
}));

// User follows relations
export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(users, {
    fields: [userFollows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [userFollows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

// Post shares relations
export const postSharesRelations = relations(postShares, ({ one }) => ({
  post: one(posts, {
    fields: [postShares.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [postShares.userId],
    references: [users.id],
  }),
}));

// Post views relations
export const postViewsRelations = relations(postViews, ({ one }) => ({
  post: one(posts, {
    fields: [postViews.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [postViews.userId],
    references: [users.id],
  }),
}));

// Saved posts relations
export const savedPostsRelations = relations(savedPosts, ({ one }) => ({
  post: one(posts, {
    fields: [savedPosts.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [savedPosts.userId],
    references: [users.id],
  }),
}));
