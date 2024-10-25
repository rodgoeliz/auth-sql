import { HTTPException } from "hono/http-exception";
import { z } from "zod";

export const getThirdPartyToken = async (token: string) => {
	const url = "https://api.themoviedb.org/3/authentication/token/new";
	const options = {
		method: "GET",
		headers: {
			accept: "application/json",
			Authorization: `Bearer ${token}`, // Use the API key in the Authorization header
		},
	};

	try {
		const response = await fetch(url, options);
		const data = await response.json();
		const responseSchema = z.object({
			success: z.boolean(),
			expires_at: z.string(),
			request_token: z.string(),
		});

		const validatedData = responseSchema.parse(data);

		if (!validatedData.request_token) {
			throw new HTTPException(500, {
				message: "Invalid response from third party API: missing request_token",
			});
		}

		return validatedData;
	} catch (error) {
		throw new HTTPException(500, {
			message: "Something went wrong authenticating in third party api",
		});
	}
};
