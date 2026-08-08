import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renamed the "middleware" convention to "proxy".
export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|admin|_next|_vercel|.*\\..*).*)",
};
