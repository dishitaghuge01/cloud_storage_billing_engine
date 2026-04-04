import { useAuth } from "@/hooks/useAuth";
import Login from "./Login";
import Dashboard from "./Dashboard";

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return session ? <Dashboard /> : <Login />;
}
