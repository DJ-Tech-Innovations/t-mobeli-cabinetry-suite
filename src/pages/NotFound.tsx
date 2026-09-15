import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Page not found</h1>
        <p className="mt-4 text-muted-foreground">Sorry, we couldn't find the page you're looking for.</p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center rounded-lg bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-900"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
