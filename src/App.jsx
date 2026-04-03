import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Auth from "./pages/Auth";
import Rider from "./pages/Rider";
import Driver from "./pages/Driver";
import Admin from "./pages/Admin";
import Onboarding from "./pages/Onboarding";
import { Loader } from "lucide-react";
import { useEffect } from "react";
import { App as CapApp } from "@capacitor/app";

function Guard({ children, role }) {
  const { token, role: r, loading } = useAuth();
  if (loading)
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-2 border-brand/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-transparent border-t-brand rounded-full animate-spin" />
        </div>
      </div>
    );
  if (!token) return <Navigate to="/" replace />;
  if (role && r !== role) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { token, role } = useAuth();
  const dest = token
    ? role === "driver"
      ? "/driver"
      : role === "admin"
        ? "/admin"
        : "/ride"
    : "/";

  return (
    <Routes>
      {/* Auth — login/register/forgot */}
      <Route path="/" element={token ? <Navigate to={dest} /> : <Auth />} />

      {/* Password reset — deep link target.
          When user taps the email link drivo://reset-password?token=xxx
          Capacitor intercepts and opens the app here.
          The Auth page reads ?token from useSearchParams and auto-enters reset mode. */}
      <Route path="/reset-password" element={<Auth />} />

      <Route
        path="/ride"
        element={
          <Guard role="user">
            <Rider />
          </Guard>
        }
      />
      <Route
        path="/driver"
        element={
          <Guard role="driver">
            <Driver />
          </Guard>
        }
      />
      <Route
        path="/driver/onboarding"
        element={
          <Guard role="driver">
            <Onboarding />
          </Guard>
        }
      />
      <Route
        path="/admin"
        element={
          <Guard role="admin">
            <Admin />
          </Guard>
        }
      />
      <Route path="*" element={<Navigate to={dest} replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    CapApp.addListener("appUrlOpen", ({ url }) => {
      // url will be: https://your-app.vercel.app/reset-password?token=xxx
      const path = new URL(url).pathname + new URL(url).search;
      // Navigate react-router to the path
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    return () => CapApp.removeAllListeners();
  }, []);
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#18181b",
                color: "#f4f4f5",
                border: "1px solid #27272a",
                borderRadius: "16px",
                fontFamily: "Poppins,sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                padding: "12px 16px",
              },
              success: { iconTheme: { primary: "#00C853", secondary: "#fff" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
