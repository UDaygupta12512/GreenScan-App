import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Add auth routes for email OTP and anonymous auth
auth.addHttpRoutes(http);

export default http;
