import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { transformApi } from "./routes/transform.js";

export type AppBindings = {
	API_KEY_MOVIE_DB: string;
};

export type AppVariables = {
	todo: string;
};

const app = new OpenAPIHono<{
	Bindings: AppBindings;
	Variables: AppVariables;
}>();
app.use(logger());
app.use("/doc/*", prettyJSON());
app.doc("/doc", {
	openapi: "3.0.0",
	info: {
		version: "1.0.0",
		title: "Action Step API",
	},
});
app.get("/ui", swaggerUI({ url: "/doc" }));
app.get(
	"/reference",
	apiReference({
		spec: {
			url: "/doc",
		},
	}),
);
app.notFound((c) => {
	return c.json({
		status: 404,
		body: {
			message: `Not Found ${c.req.url}`,
		},
	});
});

app.route("/transform", transformApi);

export default app;
