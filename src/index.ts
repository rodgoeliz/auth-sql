import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import type { Context } from "hono";
import { env } from "hono/adapter";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { HTTPException } from "hono/http-exception";

// initialize
type Bindings = {
	API_KEY_MOVIE_DB: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();
app.use(logger());

// Open api doc
app.get("/ui", swaggerUI({ url: "/doc" }));
app.use("/doc/*", prettyJSON());
app.doc("/doc", {
	openapi: "3.0.0",
	info: {
		version: "1.0.0",
		title: "Action Step API",
	},
});

/// schemas
const userASchema = z
	.object({
		email: z.string().email(),
		name: z.string(),
	})
	.openapi("UserA");

const userBSchema = z
	.object({
		email: z.string().email(),
		fullName: z.string(),
	})
	.openapi("UserB");

const ErrorSchema = z
	.object({
		code: z.number().openapi({
			example: 400,
		}),
		message: z.string().openapi({
			example: "Bad Request",
		}),
	})
	.openapi("Error");

// types
type UserA = z.infer<typeof userASchema>;
type UserB = z.infer<typeof userBSchema>;

/// routes
const route = createRoute({
	method: "post",
	path: "/transform",
	request: {
		body: {
			content: {
				"application/json": {
					schema: userASchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: userBSchema,
				},
			},
			description: "Transforms user A to user B",
		},
		400: {
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
			description: "Bad request",
		},
		500: {
			content: {
				"application/json": {
					schema: ErrorSchema,
				},
			},
			description: "Internal server error",
		},
	},
});

app.openapi(
	route,
	async (c) => {
		const userA = c.req.valid("json");
		const transformations: TransformationsOfB<UserA, UserB> = {
			email: (a) => a.email,
			fullName: (a) => a.name,
		};

		const userB = transformRawToProcessed(userA, transformations);
		const sendUser = await storeInThirdParty(userB);
		const { API_KEY_MOVIE_DB } = env(c, "node");
		console.log({ API_KEY_MOVIE_DB });

		if (!sendUser) {
			throw new HTTPException(500, {
				message: "Failed to store user in third party",
			});
		}

		return c.json({ ...userB }, 200);
	},
	(result, c) => {
		if (!result.success) {
			return c.json(
				{
					code: 400,
					message: result.error.message,
				},
				400,
			);
		}
	},
);

/// services
const storeInThirdParty = async (value: UserB) => {
	return false;
};

const getThirdPartyToken = async (c: Context) => {
	const { API_KEY_MOVIE_DB } = env<{ API_KEY_MOVIE_DB: string }>(c);

	const url = "https://api.themoviedb.org/3/authentication";
	const options = {
		method: "GET",
		headers: {
			accept: "application/json",
			Authorization: "Bearer",
		},
	};

	fetch(url, options)
		.then((res) => res.json())
		.then((json) => console.log(json))
		.catch((err) => console.error(err));
};

/// utils
type TransformationsOfB<RawType, ProcessedValue> = {
	[K in keyof ProcessedValue]: (a: RawType) => ProcessedValue[K];
};

const transformRawToProcessed = <RawType, ProcessedValue>(
	rawValue: RawType,
	transformationsOfB: TransformationsOfB<RawType, ProcessedValue>,
): ProcessedValue => {
	const keysOfB = Object.keys(transformationsOfB) as Array<
		keyof ProcessedValue
	>;
	const keyTransformedValuePair = keysOfB.map((keyOfB) => [
		keyOfB,
		transformationsOfB[keyOfB](rawValue),
	]);
	const result: ProcessedValue = Object.fromEntries(keyTransformedValuePair);
	return result;
};

// run server
const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
	fetch: app.fetch,
	port,
});
