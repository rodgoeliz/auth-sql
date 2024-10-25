import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import {
	userASchema,
	userBSchema,
	ErrorSchema,
	type UserA,
	type UserB,
} from "../schemas.js";
import { getThirdPartyToken } from "../services/getThirdPartyToken.js";
import { env } from "hono/adapter";
import { type TransformationsOfB, transformRawToProcessed } from "./utils.js";
import { storeInThirdParty } from "../services/storeInThirdParty.js";
import type { AppBindings } from "../app.js";

export const transformApi = new OpenAPIHono<{
	Bindings: AppBindings;
}>();

const route2 = createRoute({
	method: "get",
	path: "/:id",
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
	},
});

const route = createRoute({
	method: "post",
	path: "/",
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

transformApi.openapi(
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

		const token = await getThirdPartyToken(API_KEY_MOVIE_DB);

		console.log(token);
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
