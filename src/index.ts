import { serve } from "@hono/node-server";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { logger } from "hono/logger";
import { z } from "@hono/zod-openapi";
import { zValidator } from "@hono/zod-validator";
import { prettyJSON } from "hono/pretty-json";
import { swaggerUI } from "@hono/swagger-ui";

import { HTTPException } from "hono/http-exception";

// initialize
const app = new OpenAPIHono();
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
const userASchema = z.object({
	email: z.string().email(),
	name: z.string(),
});

const userBSchema = z.object({
	email: z.string().email(),
	fullName: z.string(),
});
// types
type UserA = z.infer<typeof userASchema>;
type UserB = z.infer<typeof userBSchema>;
/// routes

const route = createRoute({
	method: "post",
	path: "/transform",
	request: {
		params: userASchema,
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
	},
});

app.openapi(route, (c) => {
	const userA = c.req.valid("param");
	const transformations: TransformationsOfB<UserA, UserB> = {
		email: (a) => a.email,
		fullName: (a) => a.name,
	};

	const userB = transformRawToProcessed(userA, transformations);
	return c.json(userB);
});

/// services

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
