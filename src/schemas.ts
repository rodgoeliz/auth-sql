import { z } from "@hono/zod-openapi";

/// schemas
export const userASchema = z
	.object({
		email: z.string().email(),
		name: z.string(),
	})
	.openapi("UserA");

export const userBSchema = z
	.object({
		email: z.string().email(),
		fullName: z.string(),
	})
	.openapi("UserB");

export const ErrorSchema = z.object({
	code: z.number().openapi({
		example: 400,
	}),
	message: z.string().openapi({
		example: "Bad Request",
	}),
});

// types
export type UserA = z.infer<typeof userASchema>;
export type UserB = z.infer<typeof userBSchema>;

export type Bindings = {
	API_KEY_MOVIE_DB: string;
};
